import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions {
  event?: RealtimeEvent;
}

export function useRealtimeSubscription(
  tableName: string,
  queryKeys: string[][],
  options?: UseRealtimeSubscriptionOptions
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${tableName}-changes-${Date.now()}`)
      .on(
        'postgres_changes' as any,
        {
          event: options?.event || '*',
          schema: 'public',
          table: tableName,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`Realtime update on ${tableName}:`, payload);
          // Invalidate all provided query keys to trigger refetch
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, queryClient, options?.event]);
}

// Convenience hooks for specific departments
export function useBarRealtimeUpdates() {
  useRealtimeSubscription('bar_orders', [['bar-orders'], ['bar-stats']]);
  useRealtimeSubscription('bar_inventory', [['bar-inventory'], ['bar-stats']]);
}

export function useKitchenRealtimeUpdates() {
  useRealtimeSubscription('kitchen_orders', [['kitchen-orders']]);
  useRealtimeSubscription('kitchen_inventory', [['kitchen-inventory']]);
}

export function useRestaurantRealtimeUpdates() {
  useRealtimeSubscription('restaurant_orders', [['restaurant-orders']]);
  useRealtimeSubscription('restaurant_inventory', [['restaurant-inventory']]);
}

export function useSpaRealtimeUpdates() {
  useRealtimeSubscription('spa_bookings', [['spa-bookings']]);
  useRealtimeSubscription('spa_inventory', [['spa-inventory']]);
}

export function useHousekeepingRealtimeUpdates() {
  useRealtimeSubscription('housekeeping_tasks', [['housekeeping-tasks']]);
  useRealtimeSubscription('housekeeping_inventory', [['housekeeping-inventory']]);
}
