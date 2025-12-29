// Custom types for our Hotel Management System
// These types are aligned with the actual Supabase database schema

// Allow dynamic role names in addition to legacy roles
export type AppRole = 'admin' | 'manager' | 'user' | 'receptionist' | 'housekeeping' | 'kitchen' | 'bar' | 'restaurant' | 'spa' | (string & {});
export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';
export type PaymentMode = 'cash' | 'card' | 'upi' | 'online_wallet' | 'bank_transfer';

// Matches hotel_settings table in database
export interface HotelSettings {
  id: string;
  hotel_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  currency_symbol: string | null;
  currency_code: string | null;
  date_format: string | null;
  timezone: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  tax_percentage: number | null;
  gst_number: string | null;
  pan_number: string | null;
  fssai_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxSetting {
  id: string;
  name: string;
  percentage: number;
  description?: string | null;
  applies_to?: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  max_occupancy: number;
  amenities: unknown | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Matches rooms table - floor is integer, no is_active column
export interface Room {
  id: string;
  room_number: string;
  room_type_id: string | null;
  floor: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  room_type?: RoomType;
}

// Matches guests table - uses first_name/last_name, not full_name as required
export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  id_type: string | null;
  id_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  notes: string | null;
  total_visits: number;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reservation_number: string | null;
  guest_id: string | null;
  room_id: string | null;
  room_type_id: string | null;
  check_in_date: string;
  check_out_date: string;
  num_adults: number;
  num_children: number;
  num_guests: number;
  special_requests: string | null;
  advance_amount: number;
  status: string;
  total_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  guest?: Guest;
  room?: Room;
  room_type?: RoomType;
}

// Matches check_ins table
export interface CheckIn {
  id: string;
  reservation_id: string | null;
  guest_id: string | null;
  room_id: string | null;
  check_in_time: string;
  check_out_time: string | null;
  expected_check_out: string | null;
  actual_check_out: string | null;
  num_guests: number;
  checked_out_by: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  guest?: Guest;
  room?: Room;
  reservation?: Reservation;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
}

// Matches billing table
export interface Billing {
  id: string;
  invoice_number: string | null;
  check_in_id: string | null;
  guest_id: string | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number;
  paid_amount: number;
  status: string;
  payment_method: string | null;
  payment_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  guest?: Guest;
  check_in?: CheckIn;
}

export interface BillingItem {
  id: string;
  billing_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  service_id: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  role: string;
  module: string;
  action: string;
  is_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  module: string;
  record_id: string | null;
  record_type: string | null;
  description: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

// Module and action types for permissions
export const MODULES = [
  'dashboard',
  'reservations',
  'check_in',
  'rooms',
  'billing',
  'guests',
  'reports',
  'settings',
  'staff',
  'departments',
  'services',
  'bar',
  'kitchen',
  'restaurant',
  'spa',
  'housekeeping',
] as const;

export const ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'update_status',
  'view_others',
] as const;

export type Module = typeof MODULES[number];
export type Action = typeof ACTIONS[number];
