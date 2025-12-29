import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

const colorClasses = {
  blue: 'bg-blue-500/10 text-blue-600',
  amber: 'bg-amber-500/10 text-amber-600',
  rose: 'bg-rose-500/10 text-rose-600',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  primary: 'text-primary',
} as const;

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: keyof typeof colorClasses;
  iconClassName?: string;
}

export function StatCard({ label, value, icon: Icon, color, iconClassName }: StatCardProps) {
  const colorClass = color ? colorClasses[color] : iconClassName || 'text-primary';
  const hasBackgroundColor = color && color !== 'primary';

  return (
    <Card className="shadow-soft">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          {hasBackgroundColor ? (
            <div className={`h-12 w-12 rounded-xl ${colorClass} flex items-center justify-center`}>
              <Icon className="h-6 w-6" />
            </div>
          ) : (
            <Icon className={`h-8 w-8 ${colorClass}`} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
