import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentActivityLogs } from '@/components/shared/DepartmentActivityLogs';

export default function BarActivityLogs() {
  return (
    <DashboardLayout title="Bar Activity Logs" subtitle="Track all bar operations and changes">
      <DepartmentActivityLogs module="bar" title="Bar Activity Logs" />
    </DashboardLayout>
  );
}
