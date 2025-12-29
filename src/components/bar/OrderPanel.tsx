import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Minus, ShoppingCart, Printer, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';
import { CartItem } from '@/types/bar';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { cn } from '@/lib/utils';

interface OrderPanelProps {
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: (orderDetails: OrderDetails) => void;
  isLoading?: boolean;
}

export interface OrderDetails {
  tableNumber: string;
  orderType: 'dine_in' | 'room_service' | 'takeaway';
  notes: string;
  paymentMode?: 'cash' | 'card' | 'upi' | 'room_charge';
  payNow: boolean;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'room_charge', label: 'Room', icon: Building2 },
];

export function OrderPanel({ 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  onPlaceOrder,
  isLoading 
}: OrderPanelProps) {
  const { settings } = useHotelSettings();
  const { calculateTotalTax } = useTaxSettings();
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'room_service' | 'takeaway'>('dine_in');
  const [notes, setNotes] = useState('');
  const [payNow, setPayNow] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi' | 'room_charge'>('cash');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  // Use admin tax settings instead of hardcoded 18% GST
  const taxAmount = calculateTotalTax([{ category: 'Bar', total: subtotal }]);
  const total = subtotal + taxAmount;

  const handlePlaceOrder = () => {
    onPlaceOrder({
      tableNumber,
      orderType,
      notes,
      paymentMode: payNow ? paymentMode : undefined,
      payNow,
    });
  };

  const currencySymbol = settings?.currency_symbol || '₹';

  return (
    <Card className="h-full flex flex-col bg-card/50 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Current Order
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearCart} className="text-destructive hover:text-destructive">
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Order Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Table/Seat</Label>
            <Input
              placeholder="T1"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="h-9 bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Order Type</Label>
            <Select value={orderType} onValueChange={(v: any) => setOrderType(v)}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dine_in">Dine In</SelectItem>
                <SelectItem value="room_service">Room Service</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 -mx-4 px-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No items in cart</p>
              <p className="text-xs">Tap items to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currencySymbol}{item.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-muted rounded-lg">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.id, item.cartQuantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.cartQuantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.id, item.cartQuantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="w-16 text-right font-medium text-sm">
                      {currencySymbol}{(item.price * item.cartQuantity).toFixed(2)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Notes */}
        <Textarea
          placeholder="Order notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-16 resize-none bg-background text-sm"
        />
      </CardContent>

      {/* Footer with totals and actions */}
      <CardFooter className="flex-col gap-4 pt-4 border-t border-border">
        {/* Totals */}
        <div className="w-full space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax (18%)</span>
            <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
            <span>Total</span>
            <span className="text-primary">{currencySymbol}{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Toggle */}
        <div className="w-full">
          <div className="flex gap-2 mb-3">
            <Button
              variant={payNow ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setPayNow(true)}
            >
              Pay Now
            </Button>
            <Button
              variant={!payNow ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setPayNow(false)}
            >
              Pay Later
            </Button>
          </div>

          {payNow && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  variant={paymentMode === method.value ? 'default' : 'outline'}
                  size="sm"
                  className={cn('flex-col h-14 gap-1', paymentMode === method.value && 'bg-primary')}
                  onClick={() => setPaymentMode(method.value as any)}
                >
                  <method.icon className="h-4 w-4" />
                  <span className="text-[10px]">{method.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={cart.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            KOT
          </Button>
          <Button
            className="flex-1"
            disabled={cart.length === 0 || isLoading}
            onClick={handlePlaceOrder}
          >
            {payNow ? 'Pay & Print' : 'Place Order'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
