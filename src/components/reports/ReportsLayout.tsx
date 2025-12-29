import { ReactNode, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ReportsSidebar, ReportType, getReportsForDepartment } from "./ReportsSidebar";
import { DateRangeSelector, DateRangeType } from "./DateRangeSelector";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCompare, TrendingUp, Clock, ShoppingCart, Package, BarChart3, Calendar, Sparkles, ClipboardList, Users, History } from "lucide-react";

export type ComparisonType = 'previous' | 'last_week' | 'last_month' | 'last_year';

interface ReportsLayoutProps {
  department: "bar" | "restaurant" | "kitchen" | "spa" | "housekeeping";
  children: (props: {
    activeReport: ReportType;
    dateRange: DateRangeType;
    customDateRange: DateRange | undefined;
    startDate: Date;
    endDate: Date;
    isCompareMode: boolean;
    comparisonType: ComparisonType;
  }) => ReactNode;
  defaultReport?: ReportType;
}

const reportIcons: Record<ReportType, React.ReactNode> = {
  pl: <TrendingUp className="h-4 w-4" />,
  hourly: <Clock className="h-4 w-4" />,
  sales: <ShoppingCart className="h-4 w-4" />,
  items: <BarChart3 className="h-4 w-4" />,
  stock: <Package className="h-4 w-4" />,
  bookings: <Calendar className="h-4 w-4" />,
  services: <Sparkles className="h-4 w-4" />,
  tasks: <ClipboardList className="h-4 w-4" />,
  staff: <Users className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
};

export function ReportsLayout({ 
  department, 
  children, 
  defaultReport = "pl" 
}: ReportsLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as ReportType | null;
  const startFromUrl = searchParams.get('start');
  const endFromUrl = searchParams.get('end');
  
  const [activeReport, setActiveReport] = useState<ReportType>(tabFromUrl || defaultReport);
  const [dateRange, setDateRange] = useState<DateRangeType>(tabFromUrl === 'history' ? '30days' : 'today');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('previous');

  // Sync URL params with state
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeReport) {
      setActiveReport(tabFromUrl);
      if (tabFromUrl === 'history') {
        setDateRange('30days');
      }
    }

    // Quick Sync support: ?start=YYYY-MM-DD&end=YYYY-MM-DD
    if (startFromUrl && endFromUrl) {
      const from = new Date(`${startFromUrl}T00:00:00`);
      const to = new Date(`${endFromUrl}T23:59:59.999`);
      setCustomDateRange({ from, to });
      setDateRange('custom');
    }
  }, [tabFromUrl, startFromUrl, endFromUrl]);

  const handleReportChange = (report: ReportType) => {
    setActiveReport(report);
    // Update URL param
    if (report === defaultReport) {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', report);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const reports = getReportsForDepartment(department);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date();
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
        endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        break;
      case "7days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case "this_week":
        // Start from Monday of this week
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - diffToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case "last_week":
        // Last week Monday to Sunday
        const lastWeekDay = now.getDay();
        const diffToLastMonday = lastWeekDay === 0 ? 13 : lastWeekDay + 6;
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - diffToLastMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date();
        break;
      case "30days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        break;
      case "custom":
        if (customDateRange?.from) startDate = customDateRange.from;
        if (customDateRange?.to) endDate = customDateRange.to;
        break;
    }
    
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const getComparisonLabel = (type: ComparisonType) => {
    switch (type) {
      case 'previous': return 'Previous Period';
      case 'last_week': return 'Same Day Last Week';
      case 'last_month': return 'Same Period Last Month';
      case 'last_year': return 'Same Period Last Year';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-background rounded-lg border border-border overflow-hidden">
      {/* Header with date range and compare toggle */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-foreground">
              {getReportTitle(activeReport)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
              {isCompareMode && (
                <span className="ml-2 text-primary">
                  (Comparing with {getComparisonLabel(comparisonType).toLowerCase()})
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Compare Toggle - Only show for P/L report */}
            {activeReport === 'pl' && (
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg">
                <GitCompare className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Switch
                    id="compare-mode"
                    checked={isCompareMode}
                    onCheckedChange={setIsCompareMode}
                  />
                  <Label htmlFor="compare-mode" className="text-sm cursor-pointer">
                    Compare
                  </Label>
                </div>
                {isCompareMode && (
                  <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType)}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previous">Previous Period</SelectItem>
                      <SelectItem value="last_week">Same Day Last Week</SelectItem>
                      <SelectItem value="last_month">Same Period Last Month</SelectItem>
                      <SelectItem value="last_year">Same Period Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />
          </div>
        </div>
      </div>

      {/* Report Tabs - Horizontal navigation */}
      <div className="border-b border-border bg-muted/30 px-4">
        <Tabs value={activeReport} onValueChange={(v) => handleReportChange(v as ReportType)}>
          <TabsList className="h-12 bg-transparent gap-1 p-0">
            {reports.map((report) => (
              <TabsTrigger
                key={report.id}
                value={report.id}
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 px-4"
              >
                {reportIcons[report.id]}
                <span className="hidden sm:inline">{report.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {children({ 
          activeReport, 
          dateRange, 
          customDateRange, 
          startDate, 
          endDate,
          isCompareMode,
          comparisonType,
        })}
      </div>
    </div>
  );
}

function getReportTitle(report: ReportType): string {
  switch (report) {
    case "pl": return "Profit & Loss Report";
    case "hourly": return "Hourly Trends";
    case "sales": return "Sales Report";
    case "items": return "Item Analysis";
    case "stock": return "Stock Report";
    case "bookings": return "Bookings Report";
    case "services": return "Service Analysis";
    case "tasks": return "Task Overview";
    case "staff": return "Staff Performance";
    case "history": return "Order History";
    default: return "Report";
  }
}
