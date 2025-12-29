import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useHousekeepingTasks, useHousekeepingMutations } from '@/hooks/useDepartmentData';
import { Plus, Play, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const TASK_TYPES = [{ value: 'cleaning', label: 'Cleaning' }, { value: 'inspection', label: 'Inspection' }, { value: 'turndown', label: 'Turndown' }, { value: 'deep_cleaning', label: 'Deep Cleaning' }, { value: 'laundry', label: 'Laundry' }, { value: 'other', label: 'Other' }];
const PRIORITIES = [{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }];

export default function HousekeepingTasks() {
  const { data: tasks = [] } = useHousekeepingTasks('all');
  const { createTask, updateTaskStatus } = useHousekeepingMutations();

  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ task_type: 'cleaning', priority: 'normal', assigned_name: '', scheduled_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  const handleCreateTask = async () => {
    await createTask.mutateAsync(formData);
    setShowDialog(false);
    setFormData({ task_type: 'cleaning', priority: 'normal', assigned_name: '', scheduled_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  };

  return (
    <DashboardLayout title="Housekeeping Tasks" subtitle="Manage cleaning and maintenance tasks">
      <div className="space-y-4">
        <div className="flex justify-between items-center"><h3 className="font-semibold">All Tasks ({tasks.length})</h3><Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" />New Task</Button></div>
        <Card><CardContent className="p-0">
          <Table><TableHeader><TableRow><TableHead>Task #</TableHead><TableHead>Type</TableHead><TableHead>Assigned To</TableHead><TableHead>Date</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{tasks.map(task => (<TableRow key={task.id}>
              <TableCell className="font-medium">{task.task_number}</TableCell>
              <TableCell className="capitalize">{task.task_type.replace('_', ' ')}</TableCell>
              <TableCell>{task.assigned_name || '-'}</TableCell>
              <TableCell>{task.scheduled_date || '-'}</TableCell>
              <TableCell><span className={`px-2 py-1 rounded-full text-xs ${task.priority === 'high' ? 'bg-red-500/20 text-red-500' : task.priority === 'normal' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'}`}>{task.priority}</span></TableCell>
              <TableCell><span className={`px-2 py-1 rounded-full text-xs ${task.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' : task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>{task.status}</span></TableCell>
              <TableCell className="text-right">
                {task.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => updateTaskStatus.mutate({ id: task.id, status: 'in_progress' })}><Play className="h-4 w-4 mr-1" />Start</Button>}
                {task.status === 'in_progress' && <Button size="sm" variant="ghost" onClick={() => updateTaskStatus.mutate({ id: task.id, status: 'completed' })}><CheckCircle className="h-4 w-4 mr-1" />Complete</Button>}
              </TableCell>
            </TableRow>))}</TableBody>
          </Table>
        </CardContent></Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent><DialogHeader><DialogTitle>New Housekeeping Task</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Task Type</Label><Select value={formData.task_type} onValueChange={v => setFormData({ ...formData, task_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Priority</Label><Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Assigned To</Label><Input value={formData.assigned_name} onChange={e => setFormData({ ...formData, assigned_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Scheduled Date</Label><Input type="date" value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleCreateTask} disabled={createTask.isPending}>Create Task</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
