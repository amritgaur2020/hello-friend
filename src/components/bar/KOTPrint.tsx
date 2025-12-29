import { forwardRef } from 'react';
import { BarOrder, BarOrderItem } from '@/types/bar';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { format } from 'date-fns';

interface KOTPrintProps {
  order: BarOrder;
  items: BarOrderItem[];
  kotNumber?: number;
}

export const KOTPrint = forwardRef<HTMLDivElement, KOTPrintProps>(
  ({ order, items, kotNumber = 1 }, ref) => {
    const { settings } = useHotelSettings();

    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-4 w-[280px] font-mono text-xs"
        style={{ fontFamily: 'Courier, monospace' }}
      >
        {/* KOT Header */}
        <div className="text-center border-b-2 border-black border-dashed pb-2 mb-2">
          <h1 className="font-bold text-xl tracking-wider">*** KOT ***</h1>
          <p className="text-sm font-bold">KITCHEN ORDER TICKET</p>
        </div>

        {/* KOT Info */}
        <div className="border-b border-black border-dashed pb-2 mb-2 text-[11px]">
          <div className="flex justify-between font-bold">
            <span>KOT No:</span>
            <span>#{kotNumber.toString().padStart(4, '0')}</span>
          </div>
          <div className="flex justify-between">
            <span>Order:</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(new Date(order.created_at), 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span className="font-bold">{format(new Date(order.created_at), 'HH:mm:ss')}</span>
          </div>
        </div>

        {/* Table/Type Info */}
        <div className="border-b-2 border-black border-dashed pb-2 mb-2">
          {order.table_number && (
            <div className="text-center">
              <span className="text-lg font-bold">TABLE: {order.table_number}</span>
            </div>
          )}
          <div className="text-center">
            <span className="px-3 py-1 bg-black text-white text-[10px] font-bold uppercase">
              {order.order_type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Items - This is the main section for kitchen */}
        <div className="mb-2">
          <div className="flex justify-between font-bold text-[10px] border-b border-black pb-1 mb-1">
            <span className="flex-1">ITEM</span>
            <span className="w-12 text-center">QTY</span>
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="py-1 border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span className="flex-1 font-bold text-sm">{index + 1}. {item.item_name}</span>
                <span className="w-12 text-center font-bold text-lg">x{item.quantity}</span>
              </div>
              {item.notes && (
                <div className="text-[10px] italic pl-3 text-gray-600">
                  Note: {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total Items Count */}
        <div className="border-t-2 border-black border-dashed pt-2 mb-2">
          <div className="flex justify-between font-bold">
            <span>Total Items:</span>
            <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
        </div>

        {/* Special Notes */}
        {order.notes && (
          <div className="border-t border-dashed border-black pt-2 mb-2">
            <p className="font-bold text-[10px]">SPECIAL INSTRUCTIONS:</p>
            <p className="text-[11px] italic">{order.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t-2 border-black border-dashed text-[10px]">
          <p className="font-bold">{settings?.hotel_name || 'BAR'}</p>
          <p>Printed: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
        </div>
      </div>
    );
  }
);

KOTPrint.displayName = 'KOTPrint';