import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Activity, UtensilsCrossed, ChefHat, Wine, Sparkles, Home, RefreshCw, CalendarIcon, X, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, parseISO } from 'date-fns';
import { ActivityLog } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const QUICK_FILTERS = [
  { id: 'all', label: 'All', icon: Activity },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
  { id: 'bar', label: 'Bar', icon: Wine },
  { id: 'spa', label: 'Spa', icon: Sparkles },
  { id: 'housekeeping', label: 'Housekeeping', icon: Home },
];

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'All time', days: -1 },
];

export default function ActivityLogs() {
  const { isAdmin } = useAuth();
  const { settings } = useHotelSettings();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedPreset, setSelectedPreset] = useState('Last 7 days');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(1000);
      if (data) setLogs(data as ActivityLog[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchQuery || 
        log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.record_type?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesModule = filterModule === 'all' || log.module === filterModule;
      const matchesAction = filterAction === 'all' || log.action_type === filterAction;
      
      // Date range filter
      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        const logDate = parseISO(log.created_at);
        matchesDate = isWithinInterval(logDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }
      
      return matchesSearch && matchesModule && matchesAction && matchesDate;
    });
  }, [logs, searchQuery, filterModule, filterAction, dateRange]);

  const modules = [...new Set(logs.map(l => l.module))].filter(Boolean);
  const actions = [...new Set(logs.map(l => l.action_type))].filter(Boolean);

  const handlePresetClick = (preset: { label: string; days: number }) => {
    setSelectedPreset(preset.label);
    if (preset.days === -1) {
      setDateRange({ from: undefined, to: undefined });
    } else if (preset.days === 0) {
      const today = new Date();
      setDateRange({ from: today, to: today });
    } else {
      setDateRange({ from: subDays(new Date(), preset.days), to: new Date() });
    }
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedPreset('All time');
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create': return 'default';
      case 'edit': case 'update': return 'secondary';
      case 'delete': return 'destructive';
      default: return 'outline';
    }
  };

  const getModuleBadgeColor = (module: string) => {
    switch (module) {
      case 'restaurant': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'kitchen': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'bar': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'spa': return 'bg-pink-500/10 text-pink-600 border-pink-200';
      case 'housekeeping': return 'bg-teal-500/10 text-teal-600 border-teal-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const exportToPDF = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    
    setExporting(true);
    try {
      const doc = new jsPDF();
      const hotelName = settings?.hotel_name || 'Hotel Management';
      
      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(hotelName, 14, 20);
      doc.setFontSize(14);
      doc.text('Activity Logs Report', 14, 28);
      
      // Report info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const reportDate = format(new Date(), 'dd MMM yyyy HH:mm');
      doc.text(`Generated: ${reportDate}`, 14, 36);
      
      if (dateRange.from && dateRange.to) {
        doc.text(`Period: ${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`, 14, 42);
      }
      
      if (filterModule !== 'all') {
        doc.text(`Module: ${filterModule}`, 14, 48);
      }
      
      doc.text(`Total Entries: ${filteredLogs.length}`, 14, filterModule !== 'all' ? 54 : 48);

      // Table data
      const tableData = filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd MMM yyyy HH:mm'),
        log.action_type || '-',
        log.module || '-',
        log.record_type || '-',
        (log.description || '-').substring(0, 60) + ((log.description?.length || 0) > 60 ? '...' : '')
      ]);

      autoTable(doc, {
        startY: filterModule !== 'all' ? 60 : 54,
        head: [['Date/Time', 'Action', 'Module', 'Record Type', 'Description']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [51, 51, 51], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 20 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 'auto' },
        },
      });

      doc.save(`activity-logs-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }
    
    setExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Logs data
      const logsData = filteredLogs.map(log => ({
        'Date': format(new Date(log.created_at), 'dd MMM yyyy'),
        'Time': format(new Date(log.created_at), 'HH:mm:ss'),
        'Action': log.action_type || '-',
        'Module': log.module || '-',
        'Record Type': log.record_type || '-',
        'Record ID': log.record_id || '-',
        'Description': log.description || '-',
      }));

      const logsSheet = XLSX.utils.json_to_sheet(logsData);
      logsSheet['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, 
        { wch: 15 }, { wch: 36 }, { wch: 60 }
      ];
      XLSX.utils.book_append_sheet(workbook, logsSheet, 'Activity Logs');

      // Summary sheet
      const moduleCounts: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      
      filteredLogs.forEach(log => {
        if (log.module) moduleCounts[log.module] = (moduleCounts[log.module] || 0) + 1;
        if (log.action_type) actionCounts[log.action_type] = (actionCounts[log.action_type] || 0) + 1;
      });

      const summaryData = [
        { 'Category': 'Report Info', 'Item': 'Total Entries', 'Count': filteredLogs.length },
        { 'Category': '', 'Item': 'Date Range', 'Count': dateRange.from && dateRange.to ? `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}` : 'All time' },
        { 'Category': '', 'Item': 'Generated', 'Count': format(new Date(), 'dd MMM yyyy HH:mm') },
        { 'Category': '', 'Item': '', 'Count': '' },
        { 'Category': 'By Module', 'Item': '', 'Count': '' },
        ...Object.entries(moduleCounts).map(([module, count]) => ({
          'Category': '', 'Item': module, 'Count': count
        })),
        { 'Category': '', 'Item': '', 'Count': '' },
        { 'Category': 'By Action', 'Item': '', 'Count': '' },
        ...Object.entries(actionCounts).map(([action, count]) => ({
          'Category': '', 'Item': action, 'Count': count
        })),
      ];

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      XLSX.writeFile(workbook, `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return <DashboardLayout title="Access Denied"><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Admin access required.</p></div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Activity Logs" subtitle="View all system activity">
      <div className="space-y-6 animate-fade-in">
        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(filter => {
            const Icon = filter.icon;
            const isActive = filterModule === filter.id;
            return (
              <Button
                key={filter.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterModule(filter.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {filter.label}
              </Button>
            );
          })}
        </div>

        {/* Date Range Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Date Range:</span>
          {DATE_PRESETS.map(preset => (
            <Button
              key={preset.label}
              variant={selectedPreset === preset.label ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  setDateRange({ from: range?.from, to: range?.to });
                  setSelectedPreset('Custom');
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {dateRange.from && dateRange.to && (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-sm">
              <span>{format(dateRange.from, 'MMM dd, yyyy')}</span>
              <span>-</span>
              <span>{format(dateRange.to, 'MMM dd, yyyy')}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearDateFilter}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search descriptions, record types..." 
              className="pl-9" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Module" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchLogs} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Export Buttons */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={exporting || filteredLogs.length === 0}>
                <Download className="h-4 w-4" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2" 
                  onClick={exportToPDF}
                  disabled={exporting}
                >
                  <FileText className="h-4 w-4 text-red-500" />
                  Export as PDF
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2" 
                  onClick={exportToExcel}
                  disabled={exporting}
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Export as Excel
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Showing: <strong className="text-foreground">{filteredLogs.length}</strong> logs</span>
          {filterModule !== 'all' && (
            <span>Module: <Badge variant="outline" className="capitalize ml-1">{filterModule}</Badge></span>
          )}
          {filterAction !== 'all' && (
            <span>Action: <Badge variant="outline" className="capitalize ml-1">{filterAction}</Badge></span>
          )}
        </div>

        <Card className="shadow-soft">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64"><Activity className="h-12 w-12 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No activity logs found.</p></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Time</TableHead>
                    <TableHead className="w-24">Action</TableHead>
                    <TableHead className="w-28">Module</TableHead>
                    <TableHead className="w-24">Record</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{format(new Date(log.created_at), 'dd MMM yyyy')}</span>
                          <span className="text-xs">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action_type)} className="capitalize">
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${getModuleBadgeColor(log.module)}`}>
                          {log.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">
                        {log.record_type || '-'}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate" title={log.description || ''}>
                          {log.description || '-'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}