// Centralized role-to-module mapping configuration
// This defines which modules each role should have access to by default

export const ROLE_DEFAULT_MODULES: Record<string, string[]> = {
  // Department-specific roles
  bar_staff: ['bar', 'dashboard'],
  kitchen_staff: ['kitchen', 'dashboard'],
  restaurant_staff: ['restaurant', 'dashboard'],
  spa_staff: ['spa', 'dashboard'],
  housekeeping_staff: ['housekeeping', 'dashboard'],
  
  // Front desk roles
  receptionist: ['reservations', 'check_in', 'rooms', 'guests', 'billing', 'dashboard'],
  front_desk: ['reservations', 'check_in', 'rooms', 'guests', 'billing', 'dashboard'],
  
  // Management roles
  manager: ['*'], // All modules
  supervisor: ['*'], // All modules
  
  // Support roles
  security: ['security', 'dashboard'],
  maintenance: ['maintenance', 'housekeeping', 'dashboard'],
  parking: ['parking', 'dashboard'],
};

export const DEFAULT_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

// Get the default modules for a role
export function getDefaultModulesForRole(roleName: string): string[] {
  // Check exact match first
  if (ROLE_DEFAULT_MODULES[roleName]) {
    return ROLE_DEFAULT_MODULES[roleName];
  }
  
  // Check if role name contains any known department keywords
  const roleNameLower = roleName.toLowerCase();
  
  if (roleNameLower.includes('bar')) return ROLE_DEFAULT_MODULES.bar_staff;
  if (roleNameLower.includes('kitchen')) return ROLE_DEFAULT_MODULES.kitchen_staff;
  if (roleNameLower.includes('restaurant')) return ROLE_DEFAULT_MODULES.restaurant_staff;
  if (roleNameLower.includes('spa')) return ROLE_DEFAULT_MODULES.spa_staff;
  if (roleNameLower.includes('housekeeping')) return ROLE_DEFAULT_MODULES.housekeeping_staff;
  if (roleNameLower.includes('reception') || roleNameLower.includes('front')) return ROLE_DEFAULT_MODULES.receptionist;
  if (roleNameLower.includes('manager') || roleNameLower.includes('supervisor')) return ROLE_DEFAULT_MODULES.manager;
  if (roleNameLower.includes('security')) return ROLE_DEFAULT_MODULES.security;
  if (roleNameLower.includes('maintenance')) return ROLE_DEFAULT_MODULES.maintenance;
  if (roleNameLower.includes('parking') || roleNameLower.includes('valet')) return ROLE_DEFAULT_MODULES.parking;
  
  // Default to just dashboard
  return ['dashboard'];
}

// Map department name to primary module
export function getDepartmentPrimaryModule(departmentName: string | null | undefined): string | null {
  if (!departmentName) return null;
  
  const deptLower = departmentName.toLowerCase();
  
  if (deptLower.includes('bar')) return 'bar';
  if (deptLower.includes('kitchen')) return 'kitchen';
  if (deptLower.includes('restaurant')) return 'restaurant';
  if (deptLower.includes('spa')) return 'spa';
  if (deptLower.includes('housekeeping')) return 'housekeeping';
  if (deptLower.includes('front') || deptLower.includes('reception')) return 'reservations';
  if (deptLower.includes('security')) return 'security';
  if (deptLower.includes('maintenance')) return 'maintenance';
  if (deptLower.includes('parking') || deptLower.includes('valet')) return 'parking';
  
  return null;
}

// All available modules in the system
export const ALL_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'reservations', label: 'Reservations' },
  { key: 'check_in', label: 'Check-in' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'billing', label: 'Billing' },
  { key: 'guests', label: 'Guests' },
  { key: 'reports', label: 'Reports' },
  { key: 'room_types', label: 'Room Types' },
  { key: 'services', label: 'Services' },
  { key: 'departments', label: 'Departments' },
  { key: 'taxes', label: 'Tax Settings' },
  { key: 'staff', label: 'Staff Management' },
  { key: 'activity_logs', label: 'Activity Logs' },
  { key: 'bar', label: 'Bar & Beverages' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'spa', label: 'Spa & Wellness' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'security', label: 'Security' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'parking', label: 'Parking & Valet' },
] as const;
