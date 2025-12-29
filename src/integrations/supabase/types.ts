export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          id: string
          module: string
          record_id: string | null
          record_type: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          id?: string
          module: string
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          id?: string
          module?: string
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_config: {
        Row: {
          created_at: string | null
          id: string
          is_default_password: boolean | null
          password_changed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default_password?: boolean | null
          password_changed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default_password?: boolean | null
          password_changed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bar_inventory: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_restock_date: string | null
          last_restocked: string | null
          max_stock: number | null
          min_stock: number | null
          min_stock_level: number | null
          name: string
          price: number | null
          quantity: number | null
          selling_price: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name: string
          price?: number | null
          quantity?: number | null
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name?: string
          price?: number | null
          quantity?: number | null
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bar_inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          quantity: number
          reference_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity: number
          reference_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity?: number
          reference_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "bar_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_menu: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      bar_menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_available: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      bar_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_name: string | null
          menu_item_id: string | null
          notes: string | null
          order_id: string
          price: number
          quantity: number | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name?: string | null
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          price?: number
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string | null
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          price?: number
          quantity?: number | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "bar_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "bar_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          guest_id: string | null
          id: string
          notes: string | null
          order_number: string | null
          order_type: string | null
          payment_mode: string | null
          payment_status: string | null
          room_id: string | null
          status: string | null
          subtotal: number | null
          table_number: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      billing: {
        Row: {
          check_in_id: string | null
          created_at: string | null
          discount_amount: number | null
          due_date: string | null
          guest_id: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_method: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          check_in_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          guest_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          check_in_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          guest_id?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_items: {
        Row: {
          billing_id: string
          created_at: string | null
          description: string
          id: string
          quantity: number | null
          service_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          billing_id: string
          created_at?: string | null
          description: string
          id?: string
          quantity?: number | null
          service_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          billing_id?: string
          created_at?: string | null
          description?: string
          id?: string
          quantity?: number | null
          service_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_items_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          actual_check_out: string | null
          check_in_time: string | null
          check_out_time: string | null
          checked_out_by: string | null
          created_at: string | null
          expected_check_out: string | null
          guest_id: string | null
          id: string
          notes: string | null
          num_guests: number | null
          reservation_id: string | null
          room_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_check_out?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          checked_out_by?: string | null
          created_at?: string | null
          expected_check_out?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          reservation_id?: string | null
          room_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_check_out?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          checked_out_by?: string | null
          created_at?: string | null
          expected_check_out?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          num_guests?: number | null
          reservation_id?: string | null
          room_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          full_name: string | null
          id: string
          id_number: string | null
          id_type: string | null
          last_name: string
          nationality: string | null
          notes: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          total_visits: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          last_name: string
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_type?: string | null
          last_name?: string
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotel_settings: {
        Row: {
          address: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency_code: string | null
          currency_symbol: string | null
          date_format: string | null
          email: string | null
          fssai_number: string | null
          gst_number: string | null
          hotel_name: string | null
          id: string
          logo_url: string | null
          pan_number: string | null
          phone: string | null
          pincode: string | null
          postal_code: string | null
          state: string | null
          tagline: string | null
          tax_percentage: number | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          date_format?: string | null
          email?: string | null
          fssai_number?: string | null
          gst_number?: string | null
          hotel_name?: string | null
          id?: string
          logo_url?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          postal_code?: string | null
          state?: string | null
          tagline?: string | null
          tax_percentage?: number | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency_code?: string | null
          currency_symbol?: string | null
          date_format?: string | null
          email?: string | null
          fssai_number?: string | null
          gst_number?: string | null
          hotel_name?: string | null
          id?: string
          logo_url?: string | null
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          postal_code?: string | null
          state?: string | null
          tagline?: string | null
          tax_percentage?: number | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      housekeeping_inventory: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_restock_date: string | null
          last_restocked: string | null
          max_stock: number | null
          min_stock: number | null
          min_stock_level: number | null
          name: string
          selling_price: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name?: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      housekeeping_inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          quantity: number
          reference_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity: number
          reference_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity?: number
          reference_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "housekeeping_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_tasks: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          priority: string | null
          room_id: string | null
          scheduled_date: string | null
          started_at: string | null
          status: string | null
          task_number: string | null
          task_type: string
          updated_at: string | null
        }
        Insert: {
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          room_id?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          task_number?: string | null
          task_type: string
          updated_at?: string | null
        }
        Update: {
          assigned_name?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          room_id?: string | null
          scheduled_date?: string | null
          started_at?: string | null
          status?: string | null
          task_number?: string | null
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_inventory: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_restock_date: string | null
          last_restocked: string | null
          max_stock: number | null
          min_stock: number | null
          min_stock_level: number | null
          name: string
          selling_price: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name?: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kitchen_inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          quantity: number
          reference_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity: number
          reference_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity?: number
          reference_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "kitchen_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          ingredients: Json | null
          is_active: boolean | null
          is_available: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_active?: boolean | null
          is_available?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_active?: boolean | null
          is_available?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      kitchen_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "kitchen_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "kitchen_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          guest_id: string | null
          id: string
          notes: string | null
          order_number: string | null
          order_type: string | null
          payment_mode: string | null
          payment_status: string | null
          room_id: string | null
          served_by: string | null
          status: string | null
          subtotal: number | null
          table_number: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          served_by?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          served_by?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          id: string
          is_allowed: boolean | null
          module: string
          role: string
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          module: string
          role: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          is_allowed?: boolean | null
          module?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          requires_password_change: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          requires_password_change?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          requires_password_change?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          advance_amount: number | null
          check_in_date: string
          check_out_date: string
          created_at: string | null
          guest_id: string | null
          id: string
          notes: string | null
          num_adults: number | null
          num_children: number | null
          num_guests: number | null
          reservation_number: string | null
          room_id: string | null
          room_type_id: string | null
          special_requests: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          advance_amount?: number | null
          check_in_date: string
          check_out_date: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          num_adults?: number | null
          num_children?: number | null
          num_guests?: number | null
          reservation_number?: string | null
          room_id?: string | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          advance_amount?: number | null
          check_in_date?: string
          check_out_date?: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          num_adults?: number | null
          num_children?: number | null
          num_guests?: number | null
          reservation_number?: string | null
          room_id?: string | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_inventory: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_restock_date: string | null
          last_restocked: string | null
          max_stock: number | null
          min_stock: number | null
          min_stock_level: number | null
          name: string
          selling_price: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name?: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurant_inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          quantity: number
          reference_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity: number
          reference_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity?: number
          reference_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "restaurant_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          ingredients: Json | null
          is_active: boolean | null
          is_available: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_active?: boolean | null
          is_available?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          is_active?: boolean | null
          is_available?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurant_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          guest_id: string | null
          id: string
          notes: string | null
          order_number: string | null
          order_type: string | null
          payment_mode: string | null
          payment_status: string | null
          room_id: string | null
          served_by: string | null
          status: string | null
          subtotal: number | null
          table_number: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          served_by?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          served_by?: string | null
          status?: string | null
          subtotal?: number | null
          table_number?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_orders_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          amenities: Json | null
          base_price: number
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_occupancy: number
          name: string
          updated_at: string | null
        }
        Insert: {
          amenities?: Json | null
          base_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_occupancy?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          amenities?: Json | null
          base_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_occupancy?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string | null
          floor: number | null
          id: string
          notes: string | null
          room_number: string
          room_type_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          room_number: string
          room_type_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          floor?: number | null
          id?: string
          notes?: string | null
          room_number?: string
          room_type_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_bookings: {
        Row: {
          booking_date: string
          booking_number: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          end_time: string | null
          guest_id: string | null
          id: string
          notes: string | null
          payment_mode: string | null
          payment_status: string | null
          room_id: string | null
          service_id: string | null
          start_time: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          therapist_name: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          booking_number?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          end_time?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          service_id?: string | null
          start_time: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          therapist_name?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          booking_number?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          end_time?: string | null
          guest_id?: string | null
          id?: string
          notes?: string | null
          payment_mode?: string | null
          payment_status?: string | null
          room_id?: string | null
          service_id?: string | null
          start_time?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          therapist_name?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "spa_services"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_inventory: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          is_active: boolean | null
          last_restock_date: string | null
          last_restocked: string | null
          max_stock: number | null
          min_stock: number | null
          min_stock_level: number | null
          name: string
          selling_price: number | null
          sku: string | null
          supplier: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_restock_date?: string | null
          last_restocked?: string | null
          max_stock?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name?: string
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      spa_inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          quantity: number
          reference_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity: number
          reference_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity?: number
          reference_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "spa_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_services: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          applies_to: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          percentage: number
          updated_at: string | null
        }
        Insert: {
          applies_to?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          percentage?: number
          updated_at?: string | null
        }
        Update: {
          applies_to?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles_dynamic: {
        Row: {
          created_at: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_dynamic_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: { target_role_id: string; target_user_id: string }
        Returns: Json
      }
      check_admin_exists: { Args: never; Returns: boolean }
      generate_bar_order_number: { Args: never; Returns: string }
      generate_housekeeping_task_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_kitchen_order_number: { Args: never; Returns: string }
      generate_reservation_number: { Args: never; Returns: string }
      generate_restaurant_order_number: { Args: never; Returns: string }
      generate_spa_booking_number: { Args: never; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_activity: {
        Args: {
          _action_type: string
          _description: string
          _module: string
          _record_id?: string
          _record_type?: string
        }
        Returns: undefined
      }
      remove_user_role: { Args: { target_user_id: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "user"
        | "receptionist"
        | "housekeeping"
        | "kitchen"
        | "bar"
        | "restaurant"
        | "spa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "user",
        "receptionist",
        "housekeeping",
        "kitchen",
        "bar",
        "restaurant",
        "spa",
      ],
    },
  },
} as const
