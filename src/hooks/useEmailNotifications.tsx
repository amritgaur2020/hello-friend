import { supabase } from '@/integrations/supabase/client';
import { useHotelSettings } from './useHotelSettings';
import { toast } from 'sonner';

interface ReservationEmailData {
  to: string;
  guestName: string;
  reservationNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount?: string;
}

interface CheckInEmailData {
  to: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  checkOutDate: string;
}

interface CheckOutReminderData {
  to: string;
  guestName: string;
  roomNumber: string;
  checkOutDate: string;
}

export function useEmailNotifications() {
  const { settings } = useHotelSettings();

  const sendReservationConfirmation = async (data: ReservationEmailData) => {
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'reservation_confirmation',
          to: data.to,
          guestName: data.guestName,
          hotelName: settings?.hotel_name || 'Our Hotel',
          reservationNumber: data.reservationNumber,
          roomType: data.roomType,
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          totalAmount: data.totalAmount,
          currencySymbol: settings?.currency_symbol || '₹',
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Failed to send reservation email:', error);
      return { success: false, error: error.message };
    }
  };

  const sendCheckInConfirmation = async (data: CheckInEmailData) => {
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'checkin_confirmation',
          to: data.to,
          guestName: data.guestName,
          hotelName: settings?.hotel_name || 'Our Hotel',
          roomNumber: data.roomNumber,
          roomType: data.roomType,
          checkOutDate: data.checkOutDate,
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Failed to send check-in email:', error);
      return { success: false, error: error.message };
    }
  };

  const sendCheckOutReminder = async (data: CheckOutReminderData) => {
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'checkout_reminder',
          to: data.to,
          guestName: data.guestName,
          hotelName: settings?.hotel_name || 'Our Hotel',
          roomNumber: data.roomNumber,
          checkOutDate: data.checkOutDate,
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Failed to send checkout reminder:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    sendReservationConfirmation,
    sendCheckInConfirmation,
    sendCheckOutReminder,
  };
}
