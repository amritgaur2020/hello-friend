import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useHousekeepingInventory, useHousekeepingTasks } from '@/hooks/useDepartmentData';
import { useHousekeepingRealtimeUpdates } from '@/hooks/useRealtimeSubscription';
import { Sparkle, CheckCircle, Clock, AlertTriangle, Plus, Package, ClipboardList, BarChart3 } from 'lucide-react';
import { useMemo } from 'react';
import { QuickActionCard } from '@/components/shared/QuickActionCard';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { RecentItemsList } from '@/components/shared/RecentItemsList';
import { HousekeepingTask } from '@/types/department';

export default function HousekeepingDashboard() {
  useHousekeepingRealtimeUpdates();
  
  const { data: inventory = [] } = useHousekeepingInventory();
  const { data: tasks = [] } = useHousekeepingTasks('all');

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.scheduled_date === today || t.created_at.startsWith(today));
    const pendingTasks = todayTasks.filter(t => t.status === 'pending');
    const inProgressTasks = todayTasks.filter(t => t.status === 'in_progress');
    const completedTasks = todayTasks.filter(t => t.status === 'completed');
    const lowStockItems = inventory.filter(i => i.current_stock <= i.min_stock_level);
    return { pendingTasks: pendingTasks.length, inProgressTasks: inProgressTasks.length, completedTasks: completedTasks.length, lowStockItems: lowStockItems.length };
  }, [tasks, inventory]);

  const recentTasks = tasks.slice(0, 10);

  const renderTaskItem = (task: HousekeepingTask) => (
    <>
      <div>
        <p className="font-medium">{task.task_number}</p>
        <p className="text-xs text-muted-foreground">{task.task_type} - {task.assigned_name || 'Unassigned'}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={task.status} variant="task" />
        <PriorityBadge priority={task.priority} />
      </div>
    </>
  );

  return (
    <DashboardLayout title="Housekeeping Dashboard" subtitle="Manage tasks and inventory">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <QuickActionCard to="/housekeeping/tasks" icon={Plus} title="New Task" subtitle="Create task" isPrimary />
        <QuickActionCard to="/housekeeping/inventory" icon={Package} title="Inventory" subtitle="Manage stock" />
        <QuickActionCard to="/housekeeping/tasks" icon={ClipboardList} title="All Tasks" subtitle="View tasks" />
        <QuickActionCard to="/housekeeping/reports" icon={BarChart3} title="Reports" subtitle="View analytics" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={stats.pendingTasks} icon={Clock} iconClassName="text-amber-500" />
        <StatCard label="In Progress" value={stats.inProgressTasks} icon={Sparkle} iconClassName="text-blue-500" />
        <StatCard label="Completed" value={stats.completedTasks} icon={CheckCircle} iconClassName="text-emerald-500" />
        <StatCard label="Low Stock" value={stats.lowStockItems} icon={AlertTriangle} iconClassName="text-red-500" />
      </div>

      <RecentItemsList
        title="Recent Tasks"
        items={recentTasks}
        emptyMessage="No tasks today"
        viewAllLink="/housekeeping/tasks"
        keyExtractor={(task) => task.id}
        renderItem={renderTaskItem}
      />
    </DashboardLayout>
  );
}
