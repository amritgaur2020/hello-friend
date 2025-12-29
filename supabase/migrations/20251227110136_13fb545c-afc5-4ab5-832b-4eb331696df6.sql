-- Add fssai_number column to hotel_settings table
ALTER TABLE public.hotel_settings ADD COLUMN IF NOT EXISTS fssai_number TEXT;