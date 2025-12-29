import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Search, Printer, CreditCard, Banknote, Smartphone, Eye, Download, FileText, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Billing, Guest, CheckIn, PaymentStatus, PaymentMode } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { CheckoutBillPrint, CheckoutBillData } from '@/components/billing/CheckoutBillPrint';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BillingPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { settings } = useHotelSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const printRef = useRef<HTMLDivElement>(null);
  
  const [billings, setBillings] = useState<Billing[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billingsRes, guestsRes, checkInsRes] = await Promise.all([
        supabase.from('billing').select('*').order('created_at', { ascending: false }),
        supabase.from('guests').select('*'),
        supabase.from('check_ins').select('*'),
      ]);
      if (billingsRes.data) setBillings(billingsRes.data as Billing[]);
      if (guestsRes.data) setGuests(guestsRes.data as Guest[]);
      if (checkInsRes.data) setCheckIns(checkInsRes.data as CheckIn[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBilling) return;
    setIsSubmitting(true);

    try {
      const newPaidAmount = selectedBilling.paid_amount + parseFloat(paymentAmount);
      const newStatus: PaymentStatus = newPaidAmount >= selectedBilling.total_amount ? 'paid' : 'partial';

      const { error } = await supabase.from('billing').update({
        paid_amount: newPaidAmount,
        status: newStatus,
        payment_method: paymentMode,
      }).eq('id', selectedBilling.id);

      if (error) throw error;

      toast({ title: 'Payment Recorded!', description: `${currencySymbol}${paymentAmount} received via ${paymentMode}.` });
      setIsPaymentDialogOpen(false);
      setSelectedBilling(null);
      setPaymentAmount('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const styles: Record<PaymentStatus, string> = {
      pending: 'bg-warning/20 text-warning-foreground border-warning',
      partial: 'bg-info/20 text-info-foreground border-info',
      paid: 'bg-success/20 text-success-foreground border-success',
      refunded: 'bg-muted text-muted-foreground',
    };
    return <Badge variant="outline" className={styles[status]}>{status}</Badge>;
  };

  const getPaymentIcon = (mode: PaymentMode | null) => {
    if (!mode) return null;
    const icons: Record<PaymentMode, React.ReactNode> = {
      cash: <Banknote className="h-4 w-4" />,
      card: <CreditCard className="h-4 w-4" />,
      upi: <Smartphone className="h-4 w-4" />,
      online_wallet: <Smartphone className="h-4 w-4" />,
      bank_transfer: <CreditCard className="h-4 w-4" />,
    };
    return icons[mode];
  };

  const filteredBillings = billings.filter(bill => {
    const guest = guests.find(g => g.id === bill.guest_id);
    return !searchQuery || 
      bill.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest?.full_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pendingAmount = billings.reduce((sum, b) => sum + (b.total_amount - b.paid_amount), 0);
  const totalCollected = billings.reduce((sum, b) => sum + b.paid_amount, 0);

  const getBillData = (bill: Billing): CheckoutBillData | null => {
    const guest = guests.find(g => g.id === bill.guest_id);
    if (!guest) return null;

    return {
      hotelName: settings?.hotel_name || 'Hotel',
      hotelAddress: settings?.address || '',
      hotelCity: settings?.city || '',
      hotelState: settings?.state || '',
      hotelPincode: settings?.postal_code || '',
      hotelPhone: settings?.phone || '',
      hotelEmail: settings?.email || '',
      hotelWebsite: settings?.website || undefined,
      hotelLogo: settings?.logo_url || undefined,
      gstNumber: settings?.gst_number || undefined,
      fssaiNumber: (settings as any)?.fssai_number || undefined,
      invoiceNumber: bill.invoice_number || '',
      invoiceDate: new Date(bill.created_at),
      guestName: guest.full_name || `${guest.first_name} ${guest.last_name}`,
      guestPhone: guest.phone || '',
      guestEmail: guest.email || undefined,
      guestAddress: guest.address || undefined,
      roomNumber: '-',
      roomType: 'Standard',
      checkInDate: new Date(bill.created_at),
      checkOutDate: new Date(bill.created_at),
      nights: 1,
      numGuests: 1,
      charges: [{ category: 'Total', description: 'Invoice Total', quantity: 1, rate: bill.total_amount, total: bill.total_amount }],
      taxes: [{ name: 'Tax', percentage: bill.tax_amount ? (bill.tax_amount / bill.total_amount) * 100 : 0, amount: bill.tax_amount || 0 }],
      subtotal: bill.total_amount - (bill.tax_amount || 0),
      taxTotal: bill.tax_amount || 0,
      discount: bill.discount_amount || 0,
      grandTotal: bill.total_amount,
      advancePaid: 0,
      amountPaid: bill.paid_amount,
      balanceDue: bill.total_amount - bill.paid_amount,
      paymentMethod: bill.payment_method || 'cash',
      paymentStatus: bill.status,
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
              <title>Invoice ${selectedBilling?.invoice_number}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
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

  const handleExportCSV = () => {
    const headers = ['Invoice No', 'Guest', 'Total', 'Tax', 'Paid', 'Balance', 'Status', 'Mode', 'Date'];
    const rows = filteredBillings.map(bill => {
      const guest = guests.find(g => g.id === bill.guest_id);
      return [
        bill.invoice_number || '',
        guest?.full_name || `${guest?.first_name} ${guest?.last_name}` || '-',
        bill.total_amount,
        bill.tax_amount || 0,
        bill.paid_amount,
        bill.total_amount - bill.paid_amount,
        bill.status,
        bill.payment_method || '-',
        format(new Date(bill.created_at), 'dd/MM/yyyy'),
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export complete', description: 'Billing report downloaded as CSV.' });
  };

  const handleExportPDF = (bill: Billing) => {
    const guest = guests.find(g => g.id === bill.guest_id);
    if (!guest) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(24);
    doc.setTextColor(30, 64, 175);
    doc.text(settings?.hotel_name || 'Hotel', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (settings?.address) {
      doc.text(settings.address, pageWidth / 2, 28, { align: 'center' });
    }
    if (settings?.phone) {
      doc.text(`Tel: ${settings.phone}`, pageWidth / 2, 34, { align: 'center' });
    }

    // Invoice details
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('INVOICE', 14, 50);
    
    doc.setFontSize(10);
    doc.text(`Invoice #: ${bill.invoice_number}`, 14, 58);
    doc.text(`Date: ${format(new Date(bill.created_at), 'dd/MM/yyyy')}`, 14, 64);
    
    doc.text(`Guest: ${guest.full_name}`, pageWidth - 14, 58, { align: 'right' });
    doc.text(`Phone: ${guest.phone}`, pageWidth - 14, 64, { align: 'right' });

    // Table
    const subtotal = bill.total_amount - (bill.tax_amount || 0);
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: [
        ['Invoice Total', '1', `${currencySymbol}${subtotal.toLocaleString()}`, `${currencySymbol}${subtotal.toLocaleString()}`],
      ],
      foot: [
        ['', '', 'Subtotal:', `${currencySymbol}${subtotal.toLocaleString()}`],
        ['', '', 'Tax:', `${currencySymbol}${(bill.tax_amount || 0).toLocaleString()}`],
        ...(bill.discount_amount ? [['', '', 'Discount:', `-${currencySymbol}${bill.discount_amount.toLocaleString()}`]] : []),
        ['', '', 'Grand Total:', `${currencySymbol}${bill.total_amount.toLocaleString()}`],
        ['', '', 'Amount Paid:', `${currencySymbol}${bill.paid_amount.toLocaleString()}`],
        ['', '', 'Balance Due:', `${currencySymbol}${(bill.total_amount - bill.paid_amount).toLocaleString()}`],
      ],
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      footStyles: { fillColor: [245, 245, 245], textColor: 0 },
      theme: 'grid',
    });

    // Payment status
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    const statusColor = bill.status === 'paid' ? [22, 163, 74] : [234, 179, 8];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Payment Status: ${bill.status.toUpperCase()}`, pageWidth / 2, finalY, { align: 'center' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for your business!', pageWidth / 2, finalY + 15, { align: 'center' });
    doc.text('This is a computer-generated invoice.', pageWidth / 2, finalY + 22, { align: 'center' });

    doc.save(`Invoice-${bill.invoice_number}.pdf`);
    toast({ title: 'PDF Downloaded', description: `Invoice ${bill.invoice_number} saved.` });
  };

  const handleEmailInvoice = async (bill: Billing) => {
    const guest = guests.find(g => g.id === bill.guest_id);
    if (!guest) {
      toast({ title: 'Error', description: 'Guest not found.', variant: 'destructive' });
      return;
    }
    if (!guest.email) {
      toast({ title: 'No Email', description: 'Guest does not have an email address.', variant: 'destructive' });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'invoice_email',
          to: guest.email,
          guestName: guest.full_name || `${guest.first_name} ${guest.last_name}`,
          hotelName: settings?.hotel_name || 'Hotel',
          hotelAddress: settings?.address || '',
          hotelPhone: settings?.phone || '',
          invoiceNumber: bill.invoice_number || '',
          invoiceDate: format(new Date(bill.created_at), 'dd/MM/yyyy'),
          currencySymbol,
          items: [{ description: 'Invoice Total', quantity: 1, rate: bill.total_amount, total: bill.total_amount }],
          taxes: [{ name: 'Tax', percentage: bill.tax_amount ? Math.round((bill.tax_amount / bill.total_amount) * 100) : 0, amount: bill.tax_amount || 0 }],
          subtotal: bill.total_amount - (bill.tax_amount || 0),
          taxTotal: bill.tax_amount || 0,
          discount: bill.discount_amount || 0,
          grandTotal: bill.total_amount,
          amountPaid: bill.paid_amount,
          balanceDue: bill.total_amount - bill.paid_amount,
          paymentMethod: bill.payment_method || 'cash',
          paymentStatus: bill.status,
        },
      });

      if (error) throw error;

      toast({ title: 'Email Sent!', description: `Invoice sent to ${guest.email}` });
    } catch (error: any) {
      console.error('Email error:', error);
      toast({ title: 'Failed to Send', description: error.message || 'Could not send email.', variant: 'destructive' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <DashboardLayout title="Billing & Payments" subtitle="Manage invoices and payments" requiredModule="billing">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card-green shadow-soft">
            <CardContent className="p-6">
              <p className="text-sm font-medium opacity-80">Total Collected</p>
              <p className="text-2xl font-bold">{currencySymbol}{totalCollected.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="stat-card-coral shadow-soft">
            <CardContent className="p-6">
              <p className="text-sm font-medium opacity-80">Pending Amount</p>
              <p className="text-2xl font-bold">{currencySymbol}{pendingAmount.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="stat-card-blue shadow-soft">
            <CardContent className="p-6">
              <p className="text-sm font-medium opacity-80">Total Invoices</p>
              <p className="text-2xl font-bold">{billings.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Header with search and export */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Table */}
        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredBillings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">No Invoices</h3>
                <p className="text-muted-foreground text-sm">Invoices will appear after check-ins.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBillings.map(bill => {
                    const guest = guests.find(g => g.id === bill.guest_id);
                    const balance = bill.total_amount - bill.paid_amount;
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono text-sm">{bill.invoice_number}</TableCell>
                        <TableCell>{guest?.full_name || '-'}</TableCell>
                        <TableCell className="font-medium">{currencySymbol}{bill.total_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-success">{currencySymbol}{bill.paid_amount.toLocaleString()}</TableCell>
                        <TableCell className={balance > 0 ? 'text-destructive' : ''}>{currencySymbol}{balance.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(bill.status as PaymentStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedBilling(bill); setShowBillPreview(true); }} title="View Invoice">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedBilling(bill); setShowBillPreview(true); setTimeout(handlePrint, 100); }} title="Print">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleExportPDF(bill)} title="Download PDF">
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleEmailInvoice(bill)} disabled={isSendingEmail} title="Email Invoice">
                              <Mail className="h-4 w-4" />
                            </Button>
                            {balance > 0 && (
                              <Button size="sm" variant="outline" onClick={() => { setSelectedBilling(bill); setPaymentAmount(balance.toString()); setIsPaymentDialogOpen(true); }}>
                                Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Invoice: {selectedBilling?.invoice_number}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePayment} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Amount ({currencySymbol})</Label>
                <Input type="number" min="1" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={(v: PaymentMode) => setPaymentMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="online_wallet">Online Wallet</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Processing...' : 'Record Payment'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bill Preview Dialog */}
        <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice: {selectedBilling?.invoice_number}
              </DialogTitle>
            </DialogHeader>
            {selectedBilling && getBillData(selectedBilling) && (
              <div ref={printRef}>
                <CheckoutBillPrint data={getBillData(selectedBilling)!} />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowBillPreview(false)}>
                Close
              </Button>
              {selectedBilling && (
                <>
                  <Button variant="outline" onClick={() => handleExportPDF(selectedBilling)}>
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleEmailInvoice(selectedBilling)} disabled={isSendingEmail}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </>
              )}
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
