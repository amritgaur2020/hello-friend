import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentActivityLogs } from '@/components/shared/DepartmentActivityLogs';

export default function SpaActivityLogs() {
  return (
    <DashboardLayout title="Spa Activity Logs" subtitle="Track all spa operations and changes">
      <DepartmentActivityLogs module="spa" title="Spa Activity Logs" />
    </DashboardLayout>
  );
}
