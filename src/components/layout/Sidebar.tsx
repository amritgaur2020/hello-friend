import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  LogIn,
  DoorOpen,
  Receipt,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Hotel,
  Bell,
  BarChart3,
  Building2,
  Shield,
  KeyRound,
  ConciergeBell,
  Percent,
  BedDouble,
  UserCog,
  Wine,
  Package,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  module: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', module: 'dashboard' },
  { label: 'Reservations', icon: Calendar, href: '/reservations', module: 'reservations' },
  { label: 'Check-in', icon: LogIn, href: '/check-in', module: 'check_in' },
  { label: 'Check-out', icon: LogOut, href: '/check-out', module: 'check_in' },
  { label: 'Rooms', icon: DoorOpen, href: '/rooms', module: 'rooms' },
  { label: 'Billing', icon: Receipt, href: '/billing', module: 'billing' },
  { label: 'Guests', icon: Users, href: '/guests', module: 'guests' },
  { label: 'Reports', icon: BarChart3, href: '/reports', module: 'reports' },
];

const barItems: NavItem[] = [
  { label: 'Bar Dashboard', icon: Wine, href: '/bar/dashboard', module: 'bar' },
  { label: 'Orders (POS)', icon: Receipt, href: '/bar/orders', module: 'bar' },
  { label: 'Inventory', icon: Package, href: '/bar/inventory', module: 'bar' },
  { label: 'Menu', icon: ClipboardList, href: '/bar/menu', module: 'bar' },
  { label: 'Bar Reports', icon: BarChart3, href: '/bar/reports', module: 'bar' },
  { label: 'Activity Logs', icon: FileText, href: '/bar/activity-logs', module: 'bar' },
];

const kitchenItems: NavItem[] = [
  { label: 'Kitchen Dashboard', icon: Receipt, href: '/kitchen/dashboard', module: 'kitchen' },
  { label: 'Orders', icon: ClipboardList, href: '/kitchen/orders', module: 'kitchen' },
  { label: 'Inventory', icon: Package, href: '/kitchen/inventory', module: 'kitchen' },
  { label: 'Menu', icon: ClipboardList, href: '/kitchen/menu', module: 'kitchen' },
  { label: 'Activity Logs', icon: FileText, href: '/kitchen/activity-logs', module: 'kitchen' },
];

const restaurantItems: NavItem[] = [
  { label: 'Restaurant Dashboard', icon: Receipt, href: '/restaurant/dashboard', module: 'restaurant' },
  { label: 'Orders', icon: ClipboardList, href: '/restaurant/orders', module: 'restaurant' },
  { label: 'Inventory', icon: Package, href: '/restaurant/inventory', module: 'restaurant' },
  { label: 'Menu', icon: ClipboardList, href: '/restaurant/menu', module: 'restaurant' },
  { label: 'Reports', icon: BarChart3, href: '/restaurant/reports', module: 'restaurant' },
  { label: 'Activity Logs', icon: FileText, href: '/restaurant/activity-logs', module: 'restaurant' },
];

const spaItems: NavItem[] = [
  { label: 'Spa Dashboard', icon: Receipt, href: '/spa/dashboard', module: 'spa' },
  { label: 'Bookings', icon: Calendar, href: '/spa/bookings', module: 'spa' },
  { label: 'Services', icon: ClipboardList, href: '/spa/services', module: 'spa' },
  { label: 'Inventory', icon: Package, href: '/spa/inventory', module: 'spa' },
  { label: 'Reports', icon: BarChart3, href: '/spa/reports', module: 'spa' },
  { label: 'Activity Logs', icon: FileText, href: '/spa/activity-logs', module: 'spa' },
];

const housekeepingItems: NavItem[] = [
  { label: 'Housekeeping Dashboard', icon: Receipt, href: '/housekeeping/dashboard', module: 'housekeeping' },
  { label: 'Tasks', icon: ClipboardList, href: '/housekeeping/tasks', module: 'housekeeping' },
  { label: 'Inventory', icon: Package, href: '/housekeeping/inventory', module: 'housekeeping' },
  { label: 'Reports', icon: BarChart3, href: '/housekeeping/reports', module: 'housekeeping' },
  { label: 'Activity Logs', icon: FileText, href: '/housekeeping/activity-logs', module: 'housekeeping' },
];

const adminItems: NavItem[] = [
  { label: 'Staff', icon: Shield, href: '/admin/staff', module: 'staff', adminOnly: true },
  { label: 'Room Types', icon: BedDouble, href: '/admin/room-types', module: 'room_types', adminOnly: true },
  { label: 'Departments', icon: Building2, href: '/admin/departments', module: 'departments', adminOnly: true },
  { label: 'Services', icon: ConciergeBell, href: '/admin/services', module: 'services', adminOnly: true },
  { label: 'Tax Settings', icon: Percent, href: '/admin/taxes', module: 'taxes', adminOnly: true },
  { label: 'Permissions', icon: KeyRound, href: '/admin/permissions', module: 'permissions', adminOnly: true },
  { label: 'Roles', icon: UserCog, href: '/admin/roles', module: 'roles', adminOnly: true },
  { label: 'Settings', icon: Settings, href: '/admin/settings', module: 'settings', adminOnly: true },
  { label: 'Activity Log', icon: BarChart3, href: '/admin/logs', module: 'activity_logs', adminOnly: true },
  { label: 'P/L Report', icon: BarChart3, href: '/admin/pl-report', module: 'pl_report', adminOnly: true },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, role, signOut, hasPermission, isAdmin } = useAuth();
  const { settings } = useHotelSettings();

  const isActive = (href: string) => location.pathname === href;

  const filteredNavItems = navItems.filter(item => 
    isAdmin || hasPermission(item.module, 'view')
  );

  const filteredBarItems = barItems.filter(item => isAdmin || hasPermission(item.module, 'view'));
  const filteredKitchenItems = kitchenItems.filter(item => isAdmin || hasPermission(item.module, 'view'));
  const filteredRestaurantItems = restaurantItems.filter(item => isAdmin || hasPermission(item.module, 'view'));
  const filteredSpaItems = spaItems.filter(item => isAdmin || hasPermission(item.module, 'view'));
  const filteredHousekeepingItems = housekeepingItems.filter(item => isAdmin || hasPermission(item.module, 'view'));

  const filteredAdminItems = isAdmin ? adminItems : [];

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Hotel className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight truncate max-w-[140px]">
                {settings?.hotel_name || 'Hotel'}
              </span>
              <span className="text-xs text-sidebar-foreground/60">Management</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Hotel className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {filteredNavItems.map((item) => (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        {/* Bar Section */}
        {filteredBarItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="mt-6 mb-2 px-3">
                <span className="text-xs font-semibold uppercase text-sidebar-foreground/50">
                  Bar
                </span>
              </div>
            )}
            {collapsed && <div className="my-4 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {filteredBarItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </>
        )}

        {/* Kitchen Section */}
        {filteredKitchenItems.length > 0 && (
          <>
            {!collapsed && <div className="mt-6 mb-2 px-3"><span className="text-xs font-semibold uppercase text-sidebar-foreground/50">Kitchen</span></div>}
            {collapsed && <div className="my-4 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {filteredKitchenItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive(item.href) ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
                      <item.icon className="h-5 w-5 shrink-0" />{!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              ))}
            </div>
          </>
        )}

        {/* Restaurant Section */}
        {filteredRestaurantItems.length > 0 && (
          <>
            {!collapsed && <div className="mt-6 mb-2 px-3"><span className="text-xs font-semibold uppercase text-sidebar-foreground/50">Restaurant</span></div>}
            {collapsed && <div className="my-4 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {filteredRestaurantItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive(item.href) ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
                      <item.icon className="h-5 w-5 shrink-0" />{!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              ))}
            </div>
          </>
        )}

        {/* Spa Section */}
        {filteredSpaItems.length > 0 && (
          <>
            {!collapsed && <div className="mt-6 mb-2 px-3"><span className="text-xs font-semibold uppercase text-sidebar-foreground/50">Spa</span></div>}
            {collapsed && <div className="my-4 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {filteredSpaItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive(item.href) ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
                      <item.icon className="h-5 w-5 shrink-0" />{!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              ))}
            </div>
          </>
        )}

        {/* Housekeeping Section */}
        {filteredHousekeepingItems.length > 0 && (
          <>
            {!collapsed && <div className="mt-6 mb-2 px-3"><span className="text-xs font-semibold uppercase text-sidebar-foreground/50">Housekeeping</span></div>}
            {collapsed && <div className="my-4 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {filteredHousekeepingItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive(item.href) ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
                      <item.icon className="h-5 w-5 shrink-0" />{!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              ))}
            </div>
          </>
        )}

        {/* Admin Section */}
        {filteredAdminItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="mt-6 mb-2 px-3">
                <span className="text-xs font-semibold uppercase text-sidebar-foreground/50">
                  Admin
                </span>
              </div>
            )}
            {collapsed && <div className="my-4 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {filteredAdminItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        {/* Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-center mb-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            !collapsed && 'justify-start'
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>

        {/* User info */}
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50',
          collapsed && 'justify-center'
        )}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {profile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'User'}
              </p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize border-sidebar-border text-sidebar-foreground/60">
                {role || 'staff'}
              </Badge>
            </div>
          )}
        </div>

        {/* Logout button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'w-full mt-2 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10',
                collapsed ? 'justify-center' : 'justify-start'
              )}
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Sign Out</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              Sign Out
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}