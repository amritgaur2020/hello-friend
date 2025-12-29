import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Minus, ShoppingCart, Trash2, LucideIcon, Search, User, Building } from 'lucide-react';
import { CheckedInGuest, useCheckedInGuests } from '@/hooks/useCheckedInGuests';

export interface DepartmentMenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderData {
  order_type: string;
  table_number: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_mode?: string | null;
  notes?: string | null;
  guest_id?: string | null;
  room_id?: string | null;
}

export interface OrderItemData {
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface DepartmentOrderFormProps {
  menuItems: DepartmentMenuItem[];
  onPlaceOrder: (order: OrderData, items: OrderItemData[]) => Promise<void>;
  isLoading?: boolean;
  currencySymbol?: string;
  ItemIcon: LucideIcon;
  title?: string;
  subtitle?: string;
  showPaymentOptions?: boolean;
}

export function DepartmentOrderForm({
  menuItems,
  onPlaceOrder,
  isLoading = false,
  currencySymbol = '₹',
  ItemIcon,
  showPaymentOptions = false,
}: DepartmentOrderFormProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [notes, setNotes] = useState('');
  const [payNow, setPayNow] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash');
  
  // Guest selection for "Post to Room" feature
  const [guestSearch, setGuestSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [postToRoom, setPostToRoom] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  
  const { data: checkedInGuests = [] } = useCheckedInGuests(guestSearch);

  // When order type is room_service, auto-enable post to room if guest selected
  useEffect(() => {
    if (orderType === 'room_service' && selectedGuest) {
      setPostToRoom(true);
    }
  }, [orderType, selectedGuest]);

  const handleAddToCart = (item: DepartmentMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    }
  };

  const handleClearCart = () => setCart([]);

  const handleSelectGuest = (guest: CheckedInGuest) => {
    setSelectedGuest(guest);
    setGuestSearch('');
    setShowGuestDropdown(false);
    setTableNumber(guest.roomNumber);
    if (orderType !== 'room_service') {
      setOrderType('room_service');
    }
  };

  const handleClearGuest = () => {
    setSelectedGuest(null);
    setPostToRoom(false);
    setTableNumber('');
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = subtotal * 0.18;
  const totalAmount = subtotal + taxAmount;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    const orderData: OrderData = {
      order_type: orderType,
      table_number: tableNumber || null,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: payNow ? 'billed' : 'new',
      payment_status: postToRoom ? 'pending' : (payNow ? 'paid' : 'pending'),
      payment_mode: payNow && !postToRoom ? paymentMode : null,
      notes: notes || null,
      guest_id: postToRoom && selectedGuest ? selectedGuest.guestId : null,
      room_id: postToRoom && selectedGuest ? selectedGuest.roomId : null,
    };

    const itemsData: OrderItemData[] = cart.map((item) => ({
      menu_item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    await onPlaceOrder(orderData, itemsData);
    handleClearCart();
    setTableNumber('');
    setNotes('');
    setPayNow(false);
    setSelectedGuest(null);
    setPostToRoom(false);
  };

  const categories = [...new Set(menuItems.map((i) => i.category))];
  const availableItems = menuItems.filter((i) => i.is_available);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Menu Items */}
      <div className="lg:col-span-2 space-y-4 overflow-hidden">
        {availableItems.length === 0 ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <ItemIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">No Menu Items Available</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add items to the menu to start taking orders.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-full pr-4">
            {categories.map((category) => {
              const categoryItems = menuItems.filter((i) => i.category === category && i.is_available);
              if (categoryItems.length === 0) return null;
              return (
                <div key={category} className="mb-6">
                  <h3 className="font-semibold capitalize mb-3 text-lg">{category.replace(/_/g, ' ')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {categoryItems.map((item) => {
                      const inCart = cart.find((c) => c.id === item.id);
                      return (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={() => handleAddToCart(item)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <ItemIcon className="h-5 w-5 text-primary" />
                              </div>
                              {inCart && (
                                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                                  {inCart.quantity}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium text-sm truncate">{item.name}</h4>
                            <p className="text-primary font-bold">
                              {currencySymbol}{item.price}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        )}
      </div>

      {/* Cart */}
      <div className="lg:col-span-1 h-full">
        <Card className="sticky top-4 h-full max-h-[calc(100vh-12rem)] flex flex-col">
          <CardContent className="p-4 flex flex-col h-full gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="font-semibold">Current Order</h3>
            </div>

            {/* Guest Search for Post to Room */}
            <div className="space-y-2 shrink-0">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" />
                Guest (for Room Billing)
              </Label>
              {selectedGuest ? (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
                  <Building className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedGuest.guestName}</p>
                    <p className="text-xs text-muted-foreground">Room {selectedGuest.roomNumber}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleClearGuest} className="h-7 px-2">
                    ✕
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={guestSearch}
                    onChange={(e) => {
                      setGuestSearch(e.target.value);
                      setShowGuestDropdown(true);
                    }}
                    onFocus={() => setShowGuestDropdown(true)}
                    placeholder="Search guest by name or room..."
                    className="pl-8"
                  />
                  {showGuestDropdown && guestSearch && checkedInGuests.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-auto">
                      {checkedInGuests.map((guest) => (
                        <button
                          key={guest.checkInId}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                          onClick={() => handleSelectGuest(guest)}
                        >
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{guest.guestName}</p>
                            <p className="text-xs text-muted-foreground">Room {guest.roomNumber} • {guest.roomType}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showGuestDropdown && guestSearch && checkedInGuests.length === 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg p-3 text-center text-sm text-muted-foreground">
                      No checked-in guests found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="space-y-1">
                <Label className="text-xs">Table/Room</Label>
                <Input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Table #"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine_in">Dine In</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                    <SelectItem value="room_service">Room Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Post to Room checkbox */}
            {selectedGuest && (
              <div className="flex items-center space-x-2 p-2 bg-accent/50 rounded-lg shrink-0">
                <Checkbox
                  id="postToRoom"
                  checked={postToRoom}
                  onCheckedChange={(checked) => setPostToRoom(checked === true)}
                />
                <Label htmlFor="postToRoom" className="text-sm cursor-pointer flex-1">
                  Post to Room (Bill at Checkout)
                </Label>
              </div>
            )}

            <div className="flex-1 overflow-auto divide-y min-h-0">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No items in cart</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {currencySymbol}{item.price} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {showPaymentOptions && cart.length > 0 && !postToRoom && (
              <div className="space-y-2 border-t pt-2 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="payNow"
                    checked={payNow}
                    onChange={(e) => setPayNow(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="payNow" className="text-sm cursor-pointer">
                    Mark as paid
                  </Label>
                </div>
                {payNow && (
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="border-t pt-3 space-y-1 shrink-0">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (18%)</span>
                <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{currencySymbol}{totalAmount.toFixed(2)}</span>
              </div>
              {postToRoom && selectedGuest && (
                <p className="text-xs text-primary mt-1">
                  → Will be added to Room {selectedGuest.roomNumber} bill
                </p>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                onClick={handlePlaceOrder}
                disabled={cart.length === 0 || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Placing...' : postToRoom ? 'Post to Room' : 'Place Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
