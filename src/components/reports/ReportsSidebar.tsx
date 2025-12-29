import { cn } from "@/lib/utils";
import { 
  FileText, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  PieChart,
  Clock,
  DollarSign,
  BarChart3,
  Users,
  History
} from "lucide-react";

export type ReportType = 
  | "pl" 
  | "hourly" 
  | "sales" 
  | "items" 
  | "stock" 
  | "bookings" 
  | "services" 
  | "tasks" 
  | "staff"
  | "history";

interface ReportItem {
  id: ReportType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const defaultReports: ReportItem[] = [
  { id: "pl", label: "P/L Report", icon: DollarSign, description: "Profit & Loss Analysis" },
  { id: "hourly", label: "Hourly Trends", icon: Clock, description: "Sales by Hour" },
  { id: "sales", label: "Sales Report", icon: TrendingUp, description: "Daily Sales Analysis" },
  { id: "items", label: "Item Analysis", icon: ShoppingCart, description: "Menu Performance" },
  { id: "stock", label: "Stock Report", icon: Package, description: "Inventory Status" },
  { id: "history", label: "Order History", icon: History, description: "All Orders" },
];

const spaReports: ReportItem[] = [
  { id: "pl", label: "P/L Report", icon: DollarSign, description: "Profit & Loss Analysis" },
  { id: "hourly", label: "Hourly Trends", icon: Clock, description: "Bookings by Hour" },
  { id: "bookings", label: "Bookings Report", icon: TrendingUp, description: "Daily Bookings" },
  { id: "services", label: "Service Analysis", icon: PieChart, description: "Service Performance" },
  { id: "stock", label: "Stock Report", icon: Package, description: "Inventory Status" },
];

const housekeepingReports: ReportItem[] = [
  { id: "tasks", label: "Task Overview", icon: FileText, description: "Task Summary" },
  { id: "hourly", label: "Hourly Trends", icon: Clock, description: "Tasks by Hour" },
  { id: "staff", label: "Staff Performance", icon: Users, description: "Staff Analysis" },
  { id: "stock", label: "Stock Report", icon: Package, description: "Inventory Status" },
];

// Export function to get reports for a department
export function getReportsForDepartment(department: "bar" | "restaurant" | "kitchen" | "spa" | "housekeeping"): ReportItem[] {
  switch (department) {
    case "spa":
      return spaReports;
    case "housekeeping":
      return housekeepingReports;
    default:
      return defaultReports;
  }
}

interface ReportsSidebarProps {
  activeReport: ReportType;
  onReportChange: (report: ReportType) => void;
  department: "bar" | "restaurant" | "kitchen" | "spa" | "housekeeping";
}

export function ReportsSidebar({ activeReport, onReportChange, department }: ReportsSidebarProps) {
  const reports = getReportsForDepartment(department);

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Reports
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Select a report type</p>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {reports.map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;
          
          return (
            <button
              key={report.id}
              onClick={() => onReportChange(report.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                "hover:bg-accent/50",
                isActive 
                  ? "bg-primary/10 border border-primary/20 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 mt-0.5 flex-shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  isActive ? "text-primary" : "text-foreground"
                )}>
                  {report.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {report.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
