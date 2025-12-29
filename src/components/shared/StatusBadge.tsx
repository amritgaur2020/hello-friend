interface StatusBadgeProps {
  status: string;
  variant?: 'order' | 'booking' | 'task';
}

const orderStatusColors: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-500',
  preparing: 'bg-amber-500/20 text-amber-500',
  served: 'bg-emerald-500/20 text-emerald-500',
  completed: 'bg-emerald-500/20 text-emerald-500',
  cancelled: 'bg-red-500/20 text-red-500',
};

const bookingStatusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/20 text-blue-500',
  in_progress: 'bg-amber-500/20 text-amber-500',
  completed: 'bg-emerald-500/20 text-emerald-500',
  cancelled: 'bg-red-500/20 text-red-500',
};

const taskStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-500',
  in_progress: 'bg-blue-500/20 text-blue-500',
  completed: 'bg-emerald-500/20 text-emerald-500',
};

export function StatusBadge({ status, variant = 'order' }: StatusBadgeProps) {
  const colorMap = variant === 'task' ? taskStatusColors : variant === 'booking' ? bookingStatusColors : orderStatusColors;
  const colorClass = colorMap[status] || 'bg-muted text-muted-foreground';
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colorClass = priority === 'high' ? 'bg-red-500/20 text-red-500' : priority === 'normal' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground';
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${colorClass}`}>
      {priority}
    </span>
  );
}
