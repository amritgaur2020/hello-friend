import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type DepartmentType = 'restaurant' | 'bar' | 'kitchen' | 'spa';

interface UseOrderNotificationsOptions {
  enabled?: boolean;
  soundEnabled?: boolean;
}

// Create a simple notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6 note
    oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2); // E6 note
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Clean up
    setTimeout(() => {
      audioContext.close();
    }, 600);
  } catch (error) {
    console.log('Audio notification not supported:', error);
  }
};

export function useOrderNotifications(
  department: DepartmentType,
  options: UseOrderNotificationsOptions = {}
) {
  const { enabled = true, soundEnabled = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastOrderIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  const getTableName = useCallback(() => {
    switch (department) {
      case 'restaurant': return 'restaurant_orders';
      case 'bar': return 'bar_orders';
      case 'kitchen': return 'kitchen_orders';
      case 'spa': return 'spa_bookings';
      default: return 'restaurant_orders';
    }
  }, [department]);

  const getQueryKeys = useCallback(() => {
    switch (department) {
      case 'restaurant': return [['restaurant-orders']];
      case 'bar': return [['bar-orders'], ['bar-stats']];
      case 'kitchen': return [['kitchen-orders']];
      case 'spa': return [['spa-bookings']];
      default: return [];
    }
  }, [department]);

  const getDepartmentLabel = useCallback(() => {
    switch (department) {
      case 'restaurant': return 'Restaurant';
      case 'bar': return 'Bar';
      case 'kitchen': return 'Kitchen';
      case 'spa': return 'Spa';
      default: return 'Order';
    }
  }, [department]);

  useEffect(() => {
    if (!enabled) return;

    const tableName = getTableName();
    const queryKeys = getQueryKeys();
    
    const channel = supabase
      .channel(`${tableName}-notifications-${Date.now()}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
        },
        (payload: any) => {
          const newOrder = payload.new;
          
          // Skip first event to avoid notification on initial load
          if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            lastOrderIdRef.current = newOrder.id;
            return;
          }
          
          // Avoid duplicate notifications
          if (newOrder.id === lastOrderIdRef.current) return;
          lastOrderIdRef.current = newOrder.id;
          
          // Play sound
          if (soundEnabled) {
            playNotificationSound();
          }
          
          // Show toast notification
          const orderNumber = newOrder.order_number || newOrder.booking_number || 'New';
          const tableInfo = newOrder.table_number ? ` • Table ${newOrder.table_number}` : '';
          
          toast({
            title: `New ${getDepartmentLabel()} Order`,
            description: `${orderNumber}${tableInfo}`,
            duration: 5000,
          });
          
          // Invalidate queries to refresh data
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
        },
        () => {
          // Just invalidate queries for updates
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .subscribe();

    // Mark as initialized after a short delay
    setTimeout(() => {
      isInitializedRef.current = true;
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, soundEnabled, department, queryClient, toast, getTableName, getQueryKeys, getDepartmentLabel]);
}
