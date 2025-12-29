import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentActivityLogs } from '@/components/shared/DepartmentActivityLogs';

export default function KitchenActivityLogs() {
  return (
    <DashboardLayout title="Kitchen Activity Logs" subtitle="Track all kitchen operations and changes">
      <DepartmentActivityLogs module="kitchen" title="Kitchen Activity Logs" />
    </DashboardLayout>
  );
}
