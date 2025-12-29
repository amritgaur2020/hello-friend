import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentActivityLogs } from '@/components/shared/DepartmentActivityLogs';

export default function HousekeepingActivityLogs() {
  return (
    <DashboardLayout title="Housekeeping Activity Logs" subtitle="Track all housekeeping operations and changes">
      <DepartmentActivityLogs module="housekeeping" title="Housekeeping Activity Logs" />
    </DashboardLayout>
  );
}
