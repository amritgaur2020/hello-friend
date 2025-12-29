import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentActivityLogs } from '@/components/shared/DepartmentActivityLogs';

export default function RestaurantActivityLogs() {
  return (
    <DashboardLayout title="Restaurant Activity Logs" subtitle="Track all restaurant operations and changes">
      <DepartmentActivityLogs module="restaurant" title="Restaurant Activity Logs" />
    </DashboardLayout>
  );
}
