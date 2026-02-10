import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
  });

  const requestAndSaveLocation = useCallback(async (profileId: string) => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ latitude, longitude } as any)
              .eq('id', profileId);

            if (error) throw error;

            setState({ latitude, longitude, loading: false, error: null });
            toast.success('¡Ubicación guardada!');
            resolve({ latitude, longitude });
          } catch (err: any) {
            setState(prev => ({ ...prev, loading: false, error: err.message }));
            toast.error('Error al guardar ubicación');
            resolve(null);
          }
        },
        (err) => {
          setState(prev => ({ ...prev, loading: false, error: err.message }));
          toast.error('Permiso de ubicación denegado');
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    });
  }, []);

  return { ...state, requestAndSaveLocation };
}

// Haversine distance in km
export function getDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
