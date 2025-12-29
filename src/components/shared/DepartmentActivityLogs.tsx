import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { Search, RefreshCw, Calendar as CalendarIcon, FileText, Download, ClipboardList, Package, Receipt, CreditCard, Printer, Edit, Trash2, Plus, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useHotelSettings } from '@/hooks/useHotelSettings';

type DatePreset = 'today' | 'last7days' | 'last30days' | 'alltime' | 'custom';

interface ActivityLog {
  id: string;
  action_type: string;
  module: string;
  description: string;
  record_id: string | null;
  record_type: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
  user_id: string;
}

interface DepartmentActivityLogsProps {
  module: string;
  title: string;
}

export function DepartmentActivityLogs({ module, title }: DepartmentActivityLogsProps) {
  const { settings } = useHotelSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('last7days');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: [`${module}-activity-logs`],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('module', module)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  const getDateRange = () => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'last7days':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'last30days':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'custom':
        return { 
          start: customDateRange.from ? startOfDay(customDateRange.from) : undefined, 
          end: customDateRange.to ? endOfDay(customDateRange.to) : undefined 
        };
      case 'alltime':
      default:
        return { start: undefined, end: undefined };
    }
  };

  const filteredLogs = useMemo(() => {
    const { start, end } = getDateRange();
    
    return logs.filter((log) => {
      const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.record_type && log.record_type.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesActionType = actionTypeFilter === 'all' || log.action_type === actionTypeFilter;
      
      const logDate = new Date(log.created_at);
      const matchesDateRange = 
        (!start || isAfter(logDate, start) || logDate.getTime() === start.getTime()) &&
        (!end || isBefore(logDate, end) || logDate.getTime() === end.getTime());
      
      return matchesSearch && matchesActionType && matchesDateRange;
    });
  }, [logs, searchTerm, actionTypeFilter, datePreset, customDateRange]);

  const handleViewDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'edit':
      case 'update':
      case 'update_status':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'view':
        return <Printer className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      edit: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      update_status: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      view: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };

    return (
      <Badge className={cn('capitalize', colors[actionType] || 'bg-muted text-muted-foreground')}>
        {actionType.replace('_', ' ')}
      </Badge>
    );
  };

  const getRecordTypeBadge = (recordType: string | null) => {
    if (!recordType) return null;
    
    const icons: Record<string, React.ReactNode> = {
      order: <Receipt className="h-3 w-3 mr-1" />,
      menu_item: <ClipboardList className="h-3 w-3 mr-1" />,
      inventory: <Package className="h-3 w-3 mr-1" />,
      payment: <CreditCard className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant="outline" className="capitalize">
        {icons[recordType]}
        {recordType.replace('_', ' ')}
      </Badge>
    );
  };

  const formatJsonData = (data: any) => {
    if (!data) return 'No data';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const hotelName = settings?.hotel_name || 'Hotel';
    
    doc.setFontSize(18);
    doc.text(`${hotelName} - ${title}`, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 30);
    doc.text(`Total Records: ${filteredLogs.length}`, 14, 36);

    const tableData = filteredLogs.map((log) => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
      log.action_type.replace('_', ' '),
      log.record_type || '-',
      log.description.substring(0, 60) + (log.description.length > 60 ? '...' : ''),
    ]);

    autoTable(doc, {
      head: [['Date/Time', 'Action', 'Record Type', 'Description']],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${module}-activity-logs-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportExcel = () => {
    const exportData = filteredLogs.map((log) => ({
      'Date/Time': format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      'Action Type': log.action_type,
      'Record Type': log.record_type || '-',
      'Record ID': log.record_id || '-',
      'Description': log.description,
      'Old Data': log.old_data ? JSON.stringify(log.old_data) : '-',
      'New Data': log.new_data ? JSON.stringify(log.new_data) : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');
    XLSX.writeFile(wb, `${module}-activity-logs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const actionTypes = ['all', 'create', 'edit', 'update', 'update_status', 'delete', 'view'];

  return (
    <>
      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Activity Log Details
            </DialogTitle>
            <DialogDescription>
              Full details of the selected activity log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date/Time</p>
                    <p className="text-sm">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Action Type</p>
                    <div className="mt-1">{getActionBadge(selectedLog.action_type)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Module</p>
                    <Badge variant="secondary" className="capitalize mt-1">{selectedLog.module}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Record Type</p>
                    <div className="mt-1">{getRecordTypeBadge(selectedLog.record_type) || <span className="text-sm text-muted-foreground">-</span>}</div>
                  </div>
                </div>

                {selectedLog.record_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Record ID</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">{selectedLog.record_id}</code>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{selectedLog.description}</p>
                </div>

                {selectedLog.old_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Old Data (Before Change)</p>
                    <pre className="text-xs bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                      {formatJsonData(selectedLog.old_data)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">New Data (After Change)</p>
                    <pre className="text-xs bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                      {formatJsonData(selectedLog.new_data)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Activity Logs
              </CardTitle>
              <CardDescription>
                View all {module}-related activities including orders, inventory, menu, and payments
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'All Actions' : type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={datePreset === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('today')}
              >
                Today
              </Button>
              <Button
                variant={datePreset === 'last7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('last7days')}
              >
                7 Days
              </Button>
              <Button
                variant={datePreset === 'last30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('last30days')}
              >
                30 Days
              </Button>
              <Button
                variant={datePreset === 'alltime' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('alltime')}
              >
                All Time
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={datePreset === 'custom' ? 'default' : 'outline'} size="sm">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                    onSelect={(range) => {
                      setCustomDateRange({ from: range?.from, to: range?.to });
                      setDatePreset('custom');
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold">{filteredLogs.length}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="text-2xl font-bold text-blue-500">
                {filteredLogs.filter(l => l.record_type === 'order').length}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Menu Changes</p>
              <p className="text-2xl font-bold text-amber-500">
                {filteredLogs.filter(l => l.record_type === 'menu_item').length}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Inventory</p>
              <p className="text-2xl font-bold text-green-500">
                {filteredLogs.filter(l => l.record_type === 'inventory').length}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Prints</p>
              <p className="text-2xl font-bold text-purple-500">
                {filteredLogs.filter(l => l.action_type === 'view').length}
              </p>
            </Card>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">No activity logs found</p>
              <p className="text-sm text-muted-foreground">{title.replace(' Activity Logs', '')} activities will appear here</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Date/Time</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[80px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(log)}>
                      <TableCell className="font-mono text-xs">
                        <div>{format(new Date(log.created_at), 'dd MMM yyyy')}</div>
                        <div className="text-muted-foreground">{format(new Date(log.created_at), 'HH:mm:ss')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action_type)}
                          {getActionBadge(log.action_type)}
                        </div>
                      </TableCell>
                      <TableCell>{getRecordTypeBadge(log.record_type)}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm truncate" title={log.description}>
                          {log.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(log); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
