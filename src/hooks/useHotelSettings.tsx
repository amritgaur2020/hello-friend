import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HotelSettings } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';

interface HotelSettingsContextType {
  settings: HotelSettings | null;
  loading: boolean;
  error: Error | null;
  refreshSettings: () => Promise<void>;
}

const HotelSettingsContext = createContext<HotelSettingsContextType | undefined>(undefined);

export function HotelSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isAdmin, user } = useAuth();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Admins can access full hotel_settings, others use the public view
      if (isAdmin) {
        const { data, error } = await supabase
          .from('hotel_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setSettings(data as unknown as HotelSettings);
      } else {
        // Non-admins use the regular hotel_settings table
        const { data, error } = await supabase
          .from('hotel_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setSettings(data as unknown as HotelSettings);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch when we know the auth state
    if (user !== undefined) {
      fetchSettings();
    }
  }, [isAdmin, user]);

  return (
    <HotelSettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </HotelSettingsContext.Provider>
  );
}

export function useHotelSettings() {
  const context = useContext(HotelSettingsContext);
  if (context === undefined) {
    throw new Error('useHotelSettings must be used within a HotelSettingsProvider');
  }
  return context;
}