import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockAlertBadgeProps {
  currentStock: number;
  minStockLevel: number;
  showIcon?: boolean;
}

export function StockAlertBadge({ currentStock, minStockLevel, showIcon = true }: StockAlertBadgeProps) {
  const isLow = currentStock <= minStockLevel;
  const isCritical = currentStock <= minStockLevel / 2;
  const isOutOfStock = currentStock <= 0;

  if (isOutOfStock) {
    return (
      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
        {showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
        Out of Stock
      </Badge>
    );
  }

  if (isCritical) {
    return (
      <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
        {showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
        Critical
      </Badge>
    );
  }

  if (isLow) {
    return (
      <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
        {showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
        Low Stock
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
      {showIcon && <CheckCircle className="h-3 w-3 mr-1" />}
      In Stock
    </Badge>
  );
}

export function StockIndicator({ currentStock, minStockLevel }: StockAlertBadgeProps) {
  const percentage = Math.min((currentStock / minStockLevel) * 100, 100);
  const isLow = currentStock <= minStockLevel;
  const isCritical = currentStock <= minStockLevel / 2;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">Stock: {currentStock}</span>
        <span className="text-muted-foreground">Min: {minStockLevel}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
