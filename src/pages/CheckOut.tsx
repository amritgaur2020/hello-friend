import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { format, differenceInCalendarDays, isPast, differenceInHours } from 'date-fns';
import { LogOut, User, Clock, AlertTriangle, CreditCard, Receipt, Printer, Mail, Eye, Wine, UtensilsCrossed, Sparkles, ChefHat, Check } from 'lucide-react';
import { CheckoutBillPrint, CheckoutBillData, BillCharge, TaxBreakdown } from '@/components/billing/CheckoutBillPrint';

interface CheckInRecord {
  id: string;
  guest_id: string | null;
  room_id: string | null;
  check_in_time: string;
  check_out_time: string | null;
  expected_check_out: string | null;
  num_guests: number;
  notes: string | null;
  status: string;
  guest?: { id: string; first_name: string; last_name: string; full_name: string | null; phone: string | null; email: string | null; address?: string | null };
  room?: { id: string; room_number: string; room_type_id: string | null };
}

interface RoomType {
  id: string;
  name: string;
  base_price: number;
}

interface DepartmentOrder {
  id: string;
  order_number: string | null;
  total_amount: number;
  payment_status: string | null;
  created_at: string;
  items?: { menu_item_id: string | null; item_name: string | null; quantity: number; unit_price: number; total_price: number }[];
}

interface SpaBooking {
  id: string;
  booking_number: string | null;
  total_amount: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  spa_service?: { name: string };
}

// TaxSetting is now from the useTaxSettings hook

interface AdvancePayment {
  id: string;
  paid_amount: number;
  payment_status: string;
}

export default function CheckOut() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useHotelSettings();
  const { sendCheckOutReminder } = useEmailNotifications();
  const { getConsolidatedTaxBreakdown, calculateTotalTax, isLoading: taxLoading } = useTaxSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInRecord | null>(null);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Consolidated charges from departments - both pending and paid
  const [barOrdersPending, setBarOrdersPending] = useState<DepartmentOrder[]>([]);
  const [barOrdersPaid, setBarOrdersPaid] = useState<DepartmentOrder[]>([]);
  const [restaurantOrdersPending, setRestaurantOrdersPending] = useState<DepartmentOrder[]>([]);
  const [restaurantOrdersPaid, setRestaurantOrdersPaid] = useState<DepartmentOrder[]>([]);
  const [kitchenOrdersPending, setKitchenOrdersPending] = useState<DepartmentOrder[]>([]);
  const [kitchenOrdersPaid, setKitchenOrdersPaid] = useState<DepartmentOrder[]>([]);
  const [spaBookingsPending, setSpaBookingsPending] = useState<SpaBooking[]>([]);
  const [spaBookingsPaid, setSpaBookingsPaid] = useState<SpaBooking[]>([]);
  const [advancePayment, setAdvancePayment] = useState<AdvancePayment | null>(null);

  // Billing state
  const [billingCharges, setBillingCharges] = useState<BillCharge[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [additionalCharges, setAdditionalCharges] = useState('0');
  const [additionalChargesNote, setAdditionalChargesNote] = useState('');
  const [discount, setDiscount] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [checkInsRes, roomTypesRes] = await Promise.all([
        supabase
          .from('check_ins')
          .select(`
            *,
            guest:guests(id, first_name, last_name, full_name, phone, email, address),
            room:rooms(id, room_number, room_type_id)
          `)
          .in('status', ['checked_in', 'active'])
          .order('check_in_time', { ascending: false }),
        supabase.from('room_types').select('*'),
      ]);

      if (checkInsRes.data) setCheckIns(checkInsRes.data as unknown as CheckInRecord[]);
      if (roomTypesRes.data) setRoomTypes(roomTypesRes.data as RoomType[]);
      // Tax settings are now fetched via useTaxSettings hook
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidatedCharges = async (checkIn: CheckInRecord) => {
    try {
      if (!checkIn.guest_id) return;
      
      // Fetch ALL bar orders for this guest (both paid and pending)
      const { data: barData } = await supabase
        .from('bar_orders')
        .select(`
          id, order_number, total_amount, payment_status, created_at,
          bar_order_items(menu_item_id, item_name, quantity, unit_price, total_price)
        `)
        .eq('guest_id', checkIn.guest_id);

      // Fetch ALL restaurant orders
      const { data: restaurantData } = await supabase
        .from('restaurant_orders')
        .select(`
          id, order_number, total_amount, payment_status, created_at,
          restaurant_order_items(menu_item_id, item_name, quantity, unit_price, total_price)
        `)
        .eq('guest_id', checkIn.guest_id);

      // Fetch ALL kitchen orders
      const { data: kitchenData } = await supabase
        .from('kitchen_orders')
        .select(`
          id, order_number, total_amount, payment_status, created_at,
          kitchen_order_items(menu_item_id, item_name, quantity, unit_price, total_price)
        `)
        .eq('guest_id', checkIn.guest_id);

      // Fetch ALL spa bookings
      const { data: spaData } = await supabase
        .from('spa_bookings')
        .select(`
          id, booking_number, total_amount, status, payment_status, created_at,
          spa_service:spa_services(name)
        `)
        .eq('guest_id', checkIn.guest_id);

      // Fetch any advance payment for this specific check-in or guest (if check_in_id not linked yet)
      const { data: advanceData } = await supabase
        .from('billing')
        .select('id, paid_amount, status')
        .eq('guest_id', checkIn.guest_id)
        .eq('status', 'partial')
        .or(`check_in_id.eq.${checkIn.id},check_in_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Separate paid and pending orders
      const allBarOrders = (barData || []).map(o => ({ ...o, items: o.bar_order_items })) as unknown as DepartmentOrder[];
      setBarOrdersPending(allBarOrders.filter(o => o.payment_status === 'pending' || o.payment_status === 'partial' || o.payment_status === 'unpaid'));
      setBarOrdersPaid(allBarOrders.filter(o => o.payment_status === 'paid'));

      const allRestaurantOrders = (restaurantData || []).map(o => ({ ...o, items: o.restaurant_order_items })) as unknown as DepartmentOrder[];
      setRestaurantOrdersPending(allRestaurantOrders.filter(o => o.payment_status === 'pending' || o.payment_status === 'partial' || o.payment_status === 'unpaid'));
      setRestaurantOrdersPaid(allRestaurantOrders.filter(o => o.payment_status === 'paid'));

      const allKitchenOrders = (kitchenData || []).map(o => ({ ...o, items: o.kitchen_order_items })) as unknown as DepartmentOrder[];
      setKitchenOrdersPending(allKitchenOrders.filter(o => o.payment_status === 'pending' || o.payment_status === 'partial' || o.payment_status === 'unpaid'));
      setKitchenOrdersPaid(allKitchenOrders.filter(o => o.payment_status === 'paid'));

      const allSpaBookings = (spaData || []) as unknown as SpaBooking[];
      setSpaBookingsPending(allSpaBookings.filter(b => b.payment_status === 'pending' || b.payment_status === 'partial' || b.payment_status === 'unpaid' || b.payment_status === null));
      setSpaBookingsPaid(allSpaBookings.filter(b => b.payment_status === 'paid'));

      setAdvancePayment(advanceData ? { id: advanceData.id, paid_amount: advanceData.paid_amount, payment_status: advanceData.status } : null);
    } catch (error) {
      console.error('Error fetching consolidated charges:', error);
    }
  };

  // Calculate booked nights (check-in to expected check-out)
  const calculateBookedNights = (checkIn: CheckInRecord): number => {
    if (!checkIn.check_in_time || !checkIn.expected_check_out) return 1;
    const checkInDate = new Date(checkIn.check_in_time);
    const checkOutDate = new Date(checkIn.expected_check_out);
    const nights = differenceInCalendarDays(checkOutDate, checkInDate);
    return Math.max(1, nights);
  };

  // Calculate nights stayed so far (check-in to now)
  const calculateStayedNights = (checkIn: CheckInRecord): number => {
    if (!checkIn.check_in_time) return 1;
    const checkInDate = new Date(checkIn.check_in_time);
    const now = new Date();
    const nights = differenceInCalendarDays(now, checkInDate);
    return Math.max(1, nights);
  };

  // For billing: charge for booked nights (adjust with early/late)
  const calculateBillingNights = (checkIn: CheckInRecord): number => {
    return calculateBookedNights(checkIn);
  };

  // For display in table: show booked nights
  const getDisplayNights = (checkIn: CheckInRecord): number => {
    return calculateBookedNights(checkIn);
  };

  // Calculate early/late checkout adjustment
  const getCheckoutAdjustment = (checkIn: CheckInRecord) => {
    const bookedNights = calculateBookedNights(checkIn);
    const stayedNights = calculateStayedNights(checkIn);
    const roomType = roomTypes.find(rt => rt.id === checkIn.room?.room_type_id);
    const roomRate = roomType?.base_price || 0;
    const nightsDiff = stayedNights - bookedNights;
    
    if (nightsDiff < 0) {
      // Early checkout - potential refund
      return {
        type: 'early' as const,
        nightsDiff: Math.abs(nightsDiff),
        amount: Math.abs(nightsDiff) * roomRate,
        bookedNights,
        stayedNights,
      };
    } else if (nightsDiff > 0) {
      // Late checkout - extra charge
      return {
        type: 'late' as const,
        nightsDiff,
        amount: nightsDiff * roomRate,
        bookedNights,
        stayedNights,
      };
    }
    return { type: 'ontime' as const, nightsDiff: 0, amount: 0, bookedNights, stayedNights };
  };

  const calculateBilling = (checkIn: CheckInRecord) => {
    const roomType = roomTypes.find(rt => rt.id === checkIn.room?.room_type_id);
    const nights = calculateBillingNights(checkIn);
    const roomRate = roomType?.base_price || 0;

    const charges: BillCharge[] = [];

    // Room charges
    charges.push({
      category: 'Room Charges',
      description: `${roomType?.name || 'Standard Room'} - ${nights} night(s)`,
      quantity: nights,
      rate: roomRate,
      total: nights * roomRate,
    });

    // Bar charges (only pending)
    barOrdersPending.forEach(order => {
      order.items?.forEach(item => {
        charges.push({
          category: 'Bar',
          description: item.item_name,
          quantity: item.quantity,
          rate: item.total_price / item.quantity,
          total: item.total_price,
        });
      });
    });

    // Restaurant charges (only pending)
    restaurantOrdersPending.forEach(order => {
      order.items?.forEach(item => {
        charges.push({
          category: 'Restaurant',
          description: item.item_name,
          quantity: item.quantity,
          rate: item.total_price / item.quantity,
          total: item.total_price,
        });
      });
    });

    // Kitchen charges (only pending)
    kitchenOrdersPending.forEach(order => {
      order.items?.forEach(item => {
        charges.push({
          category: 'Kitchen',
          description: item.item_name,
          quantity: item.quantity,
          rate: item.total_price / item.quantity,
          total: item.total_price,
        });
      });
    });

    // Spa charges (only pending)
    spaBookingsPending.forEach(booking => {
      charges.push({
        category: 'Spa',
        description: booking.spa_service?.name || 'Spa Service',
        quantity: 1,
        rate: booking.total_amount,
        total: booking.total_amount,
      });
    });

    setBillingCharges(charges);
  };

  useEffect(() => {
    if (selectedCheckIn && barOrdersPending !== undefined) {
      calculateBilling(selectedCheckIn);
    }
  }, [selectedCheckIn, barOrdersPending, restaurantOrdersPending, kitchenOrdersPending, spaBookingsPending, roomTypes]);

  const handleOpenCheckout = async (checkIn: CheckInRecord) => {
    setSelectedCheckIn(checkIn);
    await fetchConsolidatedCharges(checkIn);
    setShowCheckoutDialog(true);
  };

  const getSubtotal = () => {
    const chargesTotal = billingCharges.reduce((sum, item) => sum + item.total, 0);
    const additional = parseFloat(additionalCharges || '0');
    return chargesTotal + additional;
  };

  const getTaxBreakdown = (): TaxBreakdown[] => {
    // Use the centralized tax calculation based on charge categories
    const taxBreakdown = getConsolidatedTaxBreakdown(billingCharges);
    return taxBreakdown.map(tax => ({
      name: tax.name,
      percentage: tax.percentage,
      amount: tax.amount,
    }));
  };

  const getTaxTotal = () => getTaxBreakdown().reduce((sum, tax) => sum + tax.amount, 0);

  const getGrandTotal = () => getSubtotal() + getTaxTotal() - parseFloat(discount || '0');

  const getAdvancePaid = () => advancePayment?.paid_amount || 0;

  const getBalanceDue = () => getGrandTotal() - getAdvancePaid() - parseFloat(amountPaid || '0');

  const getBillData = (): CheckoutBillData | null => {
    if (!selectedCheckIn) return null;
    
    const roomType = roomTypes.find(rt => rt.id === selectedCheckIn.room?.room_type_id);
    const nights = calculateBillingNights(selectedCheckIn);
    
    // Add additional charges if any
    const allCharges = [...billingCharges];
    if (parseFloat(additionalCharges || '0') > 0) {
      allCharges.push({
        category: 'Additional',
        description: additionalChargesNote || 'Additional Charges',
        quantity: 1,
        rate: parseFloat(additionalCharges),
        total: parseFloat(additionalCharges),
      });
    }

    return {
      hotelName: settings?.hotel_name || 'Hotel',
      hotelAddress: settings?.address || '',
      hotelCity: settings?.city || '',
      hotelState: settings?.state || '',
      hotelPincode: settings?.pincode || '',
      hotelPhone: settings?.phone || '',
      hotelEmail: settings?.email || '',
      hotelWebsite: settings?.website || undefined,
      hotelLogo: settings?.logo_url || undefined,
      gstNumber: settings?.gst_number || undefined,
      fssaiNumber: (settings as any)?.fssai_number || undefined,
      invoiceNumber: 'PENDING',
      invoiceDate: new Date(),
      guestName: selectedCheckIn.guest?.full_name || '',
      guestPhone: selectedCheckIn.guest?.phone || '',
      guestEmail: selectedCheckIn.guest?.email || undefined,
      guestAddress: selectedCheckIn.guest?.address || undefined,
      roomNumber: selectedCheckIn.room?.room_number || '',
      roomType: roomType?.name || 'Standard',
      checkInDate: new Date(selectedCheckIn.check_in_time),
      checkOutDate: new Date(),
      nights,
      numGuests: selectedCheckIn.num_guests || 1,
      charges: allCharges,
      taxes: getTaxBreakdown(),
      subtotal: getSubtotal(),
      taxTotal: getTaxTotal(),
      discount: parseFloat(discount || '0'),
      grandTotal: getGrandTotal(),
      advancePaid: getAdvancePaid(),
      amountPaid: parseFloat(amountPaid || '0'),
      balanceDue: getBalanceDue(),
      paymentMethod,
      paymentStatus: getBalanceDue() <= 0 ? 'paid' : parseFloat(amountPaid || '0') > 0 ? 'partial' : 'pending',
      currencySymbol,
    };
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .border-black { border: 1px solid black; }
                @media print { body { -webkit-print-color-adjust: exact; } }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleSendEmail = async () => {
    if (!selectedCheckIn?.guest?.email) {
      toast({ title: 'No email', description: 'Guest does not have an email address.', variant: 'destructive' });
      return;
    }

    try {
      await sendCheckOutReminder({
        to: selectedCheckIn.guest.email,
        guestName: selectedCheckIn.guest.full_name,
        roomNumber: selectedCheckIn.room?.room_number || '',
        checkOutDate: format(new Date(), 'dd/MM/yyyy'),
      });
      toast({ title: 'Email sent', description: 'Bill has been sent to guest email.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send email.', variant: 'destructive' });
    }
  };

  const handleCheckout = async () => {
    if (!selectedCheckIn) return;
    setIsSubmitting(true);

    try {
      const grandTotal = getGrandTotal();
      const paid = getAdvancePaid() + parseFloat(amountPaid || '0');
      const finalStatus = paid >= grandTotal ? 'paid' : paid > 0 ? 'partial' : 'pending';
      
      let billingRecordId: string;
      
      // Check if there's an existing advance payment billing for this guest that needs to be updated
      if (advancePayment?.id) {
        // Update the existing billing record with checkout details
        const { data: updatedBilling, error: updateError } = await supabase
          .from('billing')
          .update({
            check_in_id: selectedCheckIn.id,
            tax_amount: getTaxTotal(),
            discount_amount: parseFloat(discount || '0'),
            total_amount: grandTotal,
            paid_amount: paid,
            status: finalStatus,
            payment_method: paymentMethod,
            notes: additionalChargesNote || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', advancePayment.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        billingRecordId = updatedBilling.id;
      } else {
        // Generate invoice number and create new billing record
        const { data: invoiceNum } = await supabase.rpc('generate_invoice_number');
        
        const { data: billingRecord, error: billingError } = await supabase.from('billing').insert({
          invoice_number: invoiceNum,
          guest_id: selectedCheckIn.guest_id,
          check_in_id: selectedCheckIn.id,
          tax_amount: getTaxTotal(),
          discount_amount: parseFloat(discount || '0'),
          total_amount: grandTotal,
          paid_amount: paid,
          status: finalStatus,
          payment_method: paymentMethod,
          notes: additionalChargesNote || null,
        }).select().single();

        if (billingError) throw billingError;
        billingRecordId = billingRecord.id;
      }

      // Prepare all charges including additional charges
      const allCharges = [...billingCharges];
      if (parseFloat(additionalCharges || '0') > 0) {
        allCharges.push({
          category: 'Additional',
          description: additionalChargesNote || 'Additional Charges',
          quantity: 1,
          rate: parseFloat(additionalCharges),
          total: parseFloat(additionalCharges),
        });
      }

      // Delete existing billing items for this billing (if updating)
      if (advancePayment?.id) {
        await supabase.from('billing_items').delete().eq('billing_id', billingRecordId);
      }

      // Save billing items
      const billingItems = allCharges.map(charge => ({
        billing_id: billingRecordId,
        description: `${charge.category}: ${charge.description}`,
        quantity: charge.quantity,
        unit_price: charge.rate,
        total_price: charge.total,
      }));

      if (billingItems.length > 0) {
        await supabase.from('billing_items').insert(billingItems);
      }

      // Mark bar orders as paid
      if (barOrdersPending.length > 0) {
        await supabase
          .from('bar_orders')
          .update({ payment_status: 'paid' })
          .in('id', barOrdersPending.map(o => o.id));
      }

      // Mark restaurant orders as paid
      if (restaurantOrdersPending.length > 0) {
        await supabase
          .from('restaurant_orders')
          .update({ payment_status: 'paid' })
          .in('id', restaurantOrdersPending.map(o => o.id));
      }

      // Mark kitchen orders as paid
      if (kitchenOrdersPending.length > 0) {
        await supabase
          .from('kitchen_orders')
          .update({ payment_status: 'paid' })
          .in('id', kitchenOrdersPending.map(o => o.id));
      }

      // Mark spa bookings as paid
      if (spaBookingsPending.length > 0) {
        await supabase
          .from('spa_bookings')
          .update({ payment_status: 'paid' })
          .in('id', spaBookingsPending.map(b => b.id));
      }

      // Update check-in record
      await supabase
        .from('check_ins')
        .update({
          status: 'checked_out',
          actual_check_out: new Date().toISOString(),
          check_out_time: new Date().toISOString(),
          checked_out_by: user?.id,
        })
        .eq('id', selectedCheckIn.id);

      // Update room status to cleaning
      await supabase
        .from('rooms')
        .update({ status: 'cleaning' })
        .eq('id', selectedCheckIn.room_id);

      toast({ 
        title: 'Check-out Successful!', 
        description: `${selectedCheckIn.guest?.full_name} has been checked out from Room ${selectedCheckIn.room?.room_number}` 
      });
      
      setShowCheckoutDialog(false);
      setSelectedCheckIn(null);
      resetBillingForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBillingForm = () => {
    setBillingCharges([]);
    setBarOrdersPending([]);
    setBarOrdersPaid([]);
    setRestaurantOrdersPending([]);
    setRestaurantOrdersPaid([]);
    setKitchenOrdersPending([]);
    setKitchenOrdersPaid([]);
    setSpaBookingsPending([]);
    setSpaBookingsPaid([]);
    setAdvancePayment(null);
    setPaymentMethod('cash');
    setAdditionalCharges('0');
    setAdditionalChargesNote('');
    setDiscount('0');
    setAmountPaid('0');
  };

  const isOverdue = (expectedCheckout: string) => isPast(new Date(expectedCheckout));

  const billData = getBillData();

  return (
    <DashboardLayout title="Check-out" subtitle="Process guest departures" requiredModule="check_in">
      <div className="space-y-6 animate-fade-in">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Occupied</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkIns.length}</div>
              <p className="text-xs text-muted-foreground">Rooms with active guests</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {checkIns.filter(c => format(new Date(c.expected_check_out), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
              </div>
              <p className="text-xs text-muted-foreground">Expected departures today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {checkIns.filter(c => isOverdue(c.expected_check_out)).length}
              </div>
              <p className="text-xs text-muted-foreground">Extended stays</p>
            </CardContent>
          </Card>
        </div>

        {/* Check-ins Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Active Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : checkIns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active check-ins found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Nights</TableHead>
                    <TableHead>Expected Checkout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkIns.map((checkIn) => (
                    <TableRow key={checkIn.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{checkIn.guest?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{checkIn.guest?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        Room {checkIn.room?.room_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(checkIn.check_in_time), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDisplayNights(checkIn)} night(s)</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(checkIn.expected_check_out), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {isOverdue(checkIn.expected_check_out) ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        ) : format(new Date(checkIn.expected_check_out), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? (
                          <Badge variant="secondary">Due Today</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleOpenCheckout(checkIn)}>
                          <LogOut className="h-4 w-4 mr-1" />
                          Check-out
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Check-out: {selectedCheckIn?.guest?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="billing" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="charges">All Charges</TabsTrigger>
            </TabsList>

            <TabsContent value="billing" className="space-y-4 mt-4">
              {/* Guest & Stay Info */}
              {(() => {
                const adjustment = selectedCheckIn ? getCheckoutAdjustment(selectedCheckIn) : null;
                const roomType = roomTypes.find(rt => rt.id === selectedCheckIn?.room?.room_type_id);
                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Room</p>
                        <p className="font-medium">Room {selectedCheckIn?.room?.room_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in</p>
                        <p className="font-medium">
                          {selectedCheckIn && format(new Date(selectedCheckIn.check_in_time), 'dd/MM/yy HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Check-out</p>
                        <p className="font-medium">
                          {selectedCheckIn && format(new Date(selectedCheckIn.expected_check_out), 'dd/MM/yy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Guests</p>
                        <p className="font-medium">{selectedCheckIn?.num_guests || 1}</p>
                      </div>
                    </div>

                    {/* Nights breakdown */}
                    <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Booked Nights</span>
                        <span className="font-medium">{adjustment?.bookedNights}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Nights Stayed (till today)</span>
                        <span className="font-medium">{adjustment?.stayedNights}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Room Rate</span>
                        <span>{currencySymbol}{roomType?.base_price || 0}/night</span>
                      </div>
                      {adjustment?.type === 'early' && (
                        <div className="flex justify-between text-emerald-600 font-medium pt-2 border-t">
                          <span>Early Checkout ({adjustment.nightsDiff} night{adjustment.nightsDiff > 1 ? 's' : ''} early)</span>
                          <span>Potential Refund: {currencySymbol}{adjustment.amount.toFixed(2)}</span>
                        </div>
                      )}
                      {adjustment?.type === 'late' && (
                        <div className="flex justify-between text-amber-600 font-medium pt-2 border-t">
                          <span>Late Checkout (+{adjustment.nightsDiff} extra night{adjustment.nightsDiff > 1 ? 's' : ''})</span>
                          <span>Extra Charge: {currencySymbol}{adjustment.amount.toFixed(2)}</span>
                        </div>
                      )}
                      {adjustment?.type === 'ontime' && (
                        <div className="flex justify-between text-muted-foreground pt-2 border-t">
                          <span>Checkout Status</span>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">On Time</Badge>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Charges Summary */}
              <div className="space-y-2">
                <h4 className="font-medium">Charges Summary</h4>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {billingCharges.map((charge, index) => (
                    <div key={index} className="flex justify-between p-3">
                      <div>
                        <span className="text-sm font-medium">{charge.description}</span>
                        <span className="text-xs text-muted-foreground ml-2">({charge.category})</span>
                      </div>
                      <span className="font-medium">{currencySymbol}{charge.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {billingCharges.length === 0 && (
                    <div className="p-3 text-center text-muted-foreground text-sm">No charges yet</div>
                  )}
                </div>
              </div>

              {/* Additional Charges & Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Additional Charges</Label>
                  <Input
                    type="number"
                    min="0"
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(e.target.value)}
                  />
                  <Input
                    placeholder="Note (e.g., Room service, Laundry)"
                    value={additionalChargesNote}
                    onChange={(e) => setAdditionalChargesNote(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              {/* Total Calculation */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{getSubtotal().toFixed(2)}</span>
                </div>
                {getTaxBreakdown().map((tax, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{tax.name} ({tax.percentage}%)</span>
                    <span>{currencySymbol}{tax.amount.toFixed(2)}</span>
                  </div>
                ))}
                {parseFloat(discount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>-{currencySymbol}{parseFloat(discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Grand Total</span>
                  <span>{currencySymbol}{getGrandTotal().toFixed(2)}</span>
                </div>
                {getAdvancePaid() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Advance Paid</span>
                    <span>-{currencySymbol}{getAdvancePaid().toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid Now</Label>
                  <Input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>
              </div>

              {getBalanceDue() > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>Balance Due</span>
                    <span>{currencySymbol}{getBalanceDue().toFixed(2)}</span>
                  </div>
                </div>
              )}

              {getBalanceDue() < 0 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Refund Due</span>
                    <span>{currencySymbol}{Math.abs(getBalanceDue()).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="charges" className="space-y-4 mt-4">
              {/* Bar Orders - Pending */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Wine className="h-4 w-4" /> Bar Orders (Pending: {barOrdersPending.length})
                </h4>
                {barOrdersPending.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {barOrdersPending.map(order => (
                      <div key={order.id} className="p-3">
                        <div className="flex justify-between font-medium">
                          <span>{order.order_number}</span>
                          <span>{currencySymbol}{order.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.items?.map(item => `${item.item_name} x${item.quantity}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending bar charges</p>
                )}
                {barOrdersPaid.length > 0 && (
                  <div className="border border-emerald-500/30 rounded-lg divide-y bg-emerald-500/5">
                    <div className="p-2 text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Paid at Bar ({barOrdersPaid.length})</div>
                    {barOrdersPaid.map(order => (
                      <div key={order.id} className="p-3 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>{order.order_number}</span>
                          <span>{currencySymbol}{order.total_amount.toFixed(2)} ✓</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Restaurant Orders */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" /> Restaurant Orders (Pending: {restaurantOrdersPending.length})
                </h4>
                {restaurantOrdersPending.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {restaurantOrdersPending.map(order => (
                      <div key={order.id} className="p-3">
                        <div className="flex justify-between font-medium">
                          <span>{order.order_number}</span>
                          <span>{currencySymbol}{order.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.items?.map(item => `${item.item_name} x${item.quantity}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending restaurant charges</p>
                )}
                {restaurantOrdersPaid.length > 0 && (
                  <div className="border border-emerald-500/30 rounded-lg divide-y bg-emerald-500/5">
                    <div className="p-2 text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Paid at Restaurant ({restaurantOrdersPaid.length})</div>
                    {restaurantOrdersPaid.map(order => (
                      <div key={order.id} className="p-3 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>{order.order_number}</span>
                          <span>{currencySymbol}{order.total_amount.toFixed(2)} ✓</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kitchen Orders */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ChefHat className="h-4 w-4" /> Kitchen Orders (Pending: {kitchenOrdersPending.length})
                </h4>
                {kitchenOrdersPending.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {kitchenOrdersPending.map(order => (
                      <div key={order.id} className="p-3">
                        <div className="flex justify-between font-medium">
                          <span>{order.order_number}</span>
                          <span>{currencySymbol}{order.total_amount.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.items?.map(item => `${item.item_name} x${item.quantity}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending kitchen charges</p>
                )}
                {kitchenOrdersPaid.length > 0 && (
                  <div className="border border-emerald-500/30 rounded-lg divide-y bg-emerald-500/5">
                    <div className="p-2 text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Paid at Kitchen ({kitchenOrdersPaid.length})</div>
                    {kitchenOrdersPaid.map(order => (
                      <div key={order.id} className="p-3 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>{order.order_number}</span>
                          <span>{currencySymbol}{order.total_amount.toFixed(2)} ✓</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spa Bookings */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Spa Services (Pending: {spaBookingsPending.length})
                </h4>
                {spaBookingsPending.length > 0 ? (
                  <div className="border rounded-lg divide-y">
                    {spaBookingsPending.map(booking => (
                      <div key={booking.id} className="p-3 flex justify-between">
                        <span>{booking.spa_service?.name || booking.booking_number}</span>
                        <span className="font-medium">{currencySymbol}{booking.total_amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending spa charges</p>
                )}
                {spaBookingsPaid.length > 0 && (
                  <div className="border border-emerald-500/30 rounded-lg divide-y bg-emerald-500/5">
                    <div className="p-2 text-xs font-medium text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Paid at Spa ({spaBookingsPaid.length})</div>
                    {spaBookingsPaid.map(booking => (
                      <div key={booking.id} className="p-3 text-muted-foreground flex justify-between">
                        <span>{booking.spa_service?.name || booking.booking_number}</span>
                        <span>{currencySymbol}{booking.total_amount.toFixed(2)} ✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBillPreview(true)}>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              {selectedCheckIn?.guest?.email && (
                <Button variant="outline" size="sm" onClick={handleSendEmail}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckout} disabled={isSubmitting} className="gap-2">
                <CreditCard className="h-4 w-4" />
                {isSubmitting ? 'Processing...' : 'Complete Check-out'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bill Preview Dialog */}
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>
          {billData && (
            <div ref={printRef}>
              <CheckoutBillPrint data={billData} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillPreview(false)}>
              Close
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
