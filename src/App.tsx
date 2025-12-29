import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { HotelSettingsProvider } from "@/hooks/useHotelSettings";
import { ScrollRestoration } from "@/components/layout/ScrollRestoration";
// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Reservations from "./pages/Reservations";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import Rooms from "./pages/Rooms";
import Billing from "./pages/Billing";
import Guests from "./pages/Guests";
import Reports from "./pages/Reports";
import StaffManagement from "./pages/admin/StaffManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import ActivityLogs from "./pages/admin/ActivityLogs";
import Departments from "./pages/admin/Departments";
import Permissions from "./pages/admin/Permissions";
import Services from "./pages/admin/Services";
import TaxSettings from "./pages/admin/TaxSettings";
import RoomTypes from "./pages/admin/RoomTypes";
import RoleManagement from "./pages/admin/RoleManagement";
import NotFound from "./pages/NotFound";

// Bar Pages
import BarDashboard from "./pages/bar/BarDashboard";
import BarOrders from "./pages/bar/BarOrders";
import BarInventory from "./pages/bar/BarInventory";
import BarMenu from "./pages/bar/BarMenu";
import BarReports from "./pages/bar/BarReports";
import BarActivityLogs from "./pages/bar/BarActivityLogs";

// Kitchen Pages
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";
import KitchenOrders from "./pages/kitchen/KitchenOrders";
import KitchenInventory from "./pages/kitchen/KitchenInventory";
import KitchenMenu from "./pages/kitchen/KitchenMenu";
import KitchenReports from "./pages/kitchen/KitchenReports";
import KitchenActivityLogs from "./pages/kitchen/KitchenActivityLogs";

// Restaurant Pages
import RestaurantDashboard from "./pages/restaurant/RestaurantDashboard";
import RestaurantOrders from "./pages/restaurant/RestaurantOrders";
import RestaurantInventory from "./pages/restaurant/RestaurantInventory";
import RestaurantMenu from "./pages/restaurant/RestaurantMenu";
import RestaurantReports from "./pages/restaurant/RestaurantReports";
import RestaurantActivityLogs from "./pages/restaurant/RestaurantActivityLogs";

// Spa Pages
import SpaDashboard from "./pages/spa/SpaDashboard";
import SpaBookings from "./pages/spa/SpaBookings";
import SpaInventory from "./pages/spa/SpaInventory";
import SpaServices from "./pages/spa/SpaServices";
import SpaReports from "./pages/spa/SpaReports";
import SpaActivityLogs from "./pages/spa/SpaActivityLogs";

// Housekeeping Pages
import HousekeepingDashboard from "./pages/housekeeping/HousekeepingDashboard";
import HousekeepingTasks from "./pages/housekeeping/HousekeepingTasks";
import HousekeepingInventory from "./pages/housekeeping/HousekeepingInventory";
import HousekeepingReports from "./pages/housekeeping/HousekeepingReports";
import HousekeepingActivityLogs from "./pages/housekeeping/HousekeepingActivityLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <HotelSettingsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollRestoration />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/check-out" element={<CheckOut />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/guests" element={<Guests />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/admin/staff" element={<StaffManagement />} />
              <Route path="/admin/room-types" element={<RoomTypes />} />
              <Route path="/admin/departments" element={<Departments />} />
              <Route path="/admin/services" element={<Services />} />
              <Route path="/admin/taxes" element={<TaxSettings />} />
              <Route path="/admin/permissions" element={<Permissions />} />
              <Route path="/admin/roles" element={<RoleManagement />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/logs" element={<ActivityLogs />} />
              {/* Bar Routes */}
              <Route path="/bar" element={<BarDashboard />} />
              <Route path="/bar/dashboard" element={<BarDashboard />} />
              <Route path="/bar/orders" element={<BarOrders />} />
              <Route path="/bar/inventory" element={<BarInventory />} />
              <Route path="/bar/menu" element={<BarMenu />} />
              <Route path="/bar/reports" element={<BarReports />} />
              <Route path="/bar/activity-logs" element={<BarActivityLogs />} />
              {/* Kitchen Routes */}
              <Route path="/kitchen" element={<KitchenDashboard />} />
              <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
              <Route path="/kitchen/orders" element={<KitchenOrders />} />
              <Route path="/kitchen/inventory" element={<KitchenInventory />} />
              <Route path="/kitchen/menu" element={<KitchenMenu />} />
              <Route path="/kitchen/reports" element={<KitchenReports />} />
              <Route path="/kitchen/activity-logs" element={<KitchenActivityLogs />} />
              {/* Restaurant Routes */}
              <Route path="/restaurant" element={<RestaurantDashboard />} />
              <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
              <Route path="/restaurant/orders" element={<RestaurantOrders />} />
              <Route path="/restaurant/inventory" element={<RestaurantInventory />} />
              <Route path="/restaurant/menu" element={<RestaurantMenu />} />
              <Route path="/restaurant/reports" element={<RestaurantReports />} />
              <Route path="/restaurant/activity-logs" element={<RestaurantActivityLogs />} />
              {/* Spa Routes */}
              <Route path="/spa" element={<SpaDashboard />} />
              <Route path="/spa/dashboard" element={<SpaDashboard />} />
              <Route path="/spa/bookings" element={<SpaBookings />} />
              <Route path="/spa/inventory" element={<SpaInventory />} />
              <Route path="/spa/services" element={<SpaServices />} />
              <Route path="/spa/reports" element={<SpaReports />} />
              <Route path="/spa/activity-logs" element={<SpaActivityLogs />} />
              {/* Housekeeping Routes */}
              <Route path="/housekeeping" element={<HousekeepingDashboard />} />
              <Route path="/housekeeping/dashboard" element={<HousekeepingDashboard />} />
              <Route path="/housekeeping/tasks" element={<HousekeepingTasks />} />
              <Route path="/housekeeping/inventory" element={<HousekeepingInventory />} />
              <Route path="/housekeeping/reports" element={<HousekeepingReports />} />
              <Route path="/housekeeping/activity-logs" element={<HousekeepingActivityLogs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </HotelSettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
