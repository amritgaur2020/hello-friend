import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  preparing: { label: 'Preparing', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  served: { label: 'Served', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  billed: { label: 'Billed', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  paid: { label: 'Paid', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  partial: { label: 'Partial', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium',
        config.className,
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        size === 'lg' && 'text-sm px-3 py-1'
      )}
    >
      {config.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const config = paymentStatusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium',
        config.className,
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        size === 'lg' && 'text-sm px-3 py-1'
      )}
    >
      {config.label}
    </Badge>
  );
}
