import { forwardRef } from 'react';
import { DepartmentOrder, DepartmentOrderItem } from '@/types/department';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { format } from 'date-fns';

interface RestaurantBillPrintProps {
  order: DepartmentOrder;
  items: DepartmentOrderItem[];
}

export const RestaurantBillPrint = forwardRef<HTMLDivElement, RestaurantBillPrintProps>(
  ({ order, items }, ref) => {
    const { settings } = useHotelSettings();
    const currencySymbol = settings?.currency_symbol || '₹';

    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-6 w-[320px] font-mono text-xs"
        style={{ fontFamily: 'Courier, monospace' }}
      >
        {/* Header with Hotel Info */}
        <div className="text-center border-b-2 border-black pb-3 mb-3">
          <h1 className="font-bold text-xl tracking-wide">{settings?.hotel_name || 'RESTAURANT'}</h1>
          {settings?.tagline && <p className="text-[10px] italic">{settings.tagline}</p>}
          <div className="text-[9px] mt-1 leading-tight">
            {settings?.address && <p>{settings.address}</p>}
            {settings?.city && settings?.state && (
              <p>{settings.city}, {settings.state} {settings?.pincode}</p>
            )}
            {settings?.phone && <p>Ph: {settings.phone}</p>}
            {settings?.email && <p>{settings.email}</p>}
          </div>
        </div>

        {/* Tax Invoice Header */}
        <div className="text-center mb-3">
          <p className="font-bold border border-black inline-block px-4 py-1">TAX INVOICE</p>
        </div>

        {/* Bill Details */}
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[11px]">
          <div className="grid grid-cols-2 gap-1">
            <div className="flex justify-between">
              <span>Bill No:</span>
              <span className="font-bold">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{format(new Date(order.created_at), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{format(new Date(order.created_at), 'HH:mm')}</span>
            </div>
            {order.table_number && (
              <div className="flex justify-between">
                <span>Table:</span>
                <span className="font-bold">{order.table_number}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span>Type:</span>
            <span className="capitalize font-bold">{order.order_type.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left pb-1">Item</th>
                <th className="text-center pb-1 w-10">Qty</th>
                <th className="text-right pb-1 w-14">Rate</th>
                <th className="text-right pb-1 w-16">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-dotted border-gray-400">
                  <td className="py-1 pr-1">
                    <span className="text-[9px]">{index + 1}.</span> {item.item_name}
                  </td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">{item.unit_price.toFixed(2)}</td>
                  <td className="text-right py-1 font-medium">{item.total_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Sub Total:</span>
            <span>{currencySymbol} {order.subtotal.toFixed(2)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount:</span>
              <span>- {currencySymbol} {order.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>CGST @9%:</span>
            <span>{currencySymbol} {(order.tax_amount / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST @9%:</span>
            <span>{currencySymbol} {(order.tax_amount / 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-2 border-t-2 border-black mt-2">
            <span>GRAND TOTAL:</span>
            <span>{currencySymbol} {order.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mt-2 pt-2 border-t border-dashed border-black text-[10px]">
          <p><span className="font-bold">Amount in words:</span></p>
          <p className="italic capitalize">
            {numberToWords(Math.floor(order.total_amount))} Rupees Only
          </p>
        </div>

        {/* Payment Info */}
        <div className="mt-2 pt-2 border-t border-dashed border-black text-[11px]">
          {order.payment_status === 'paid' ? (
            <div className="text-center">
              <p className="font-bold bg-black text-white inline-block px-4 py-1">
                PAID - {order.payment_mode?.toUpperCase()}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-bold border border-black inline-block px-4 py-1">
                PAYMENT PENDING
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-dashed border-black text-center text-[9px]">
          <p className="font-bold">Thank you for dining with us!</p>
          <p>Please visit again</p>
          <div className="mt-2 text-[8px] leading-tight">
            <p>* This is a computer generated bill *</p>
            <p>* Subject to realization of payment *</p>
          </div>
        </div>

        {/* GST/FSSAI Info */}
        {(settings?.gst_number || (settings as any)?.fssai_number) && (
          <div className="mt-2 pt-2 border-t border-dotted border-black text-[8px] text-center">
            {settings?.gst_number && <p>GSTIN: {settings.gst_number}</p>}
            {(settings as any)?.fssai_number && <p>FSSAI Lic: {(settings as any).fssai_number}</p>}
          </div>
        )}
      </div>
    );
  }
);

// Helper function to convert number to words
function numberToWords(num: number): string {
  if (num === 0) return 'zero';
  
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  const numToWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };
  
  return numToWords(num);
}

RestaurantBillPrint.displayName = 'RestaurantBillPrint';
