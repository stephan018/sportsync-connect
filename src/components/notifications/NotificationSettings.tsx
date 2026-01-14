import { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { soundManager } from '@/lib/sounds';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;
}

export function NotificationSettings({ hasPermission, requestPermission }: NotificationSettingsProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled());
  }, []);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    soundManager.setEnabled(enabled);
    
    if (enabled) {
      // Play a preview sound
      soundManager.playConfirmSound();
      toast.success('Sonidos activados');
    } else {
      toast.info('Sonidos desactivados');
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    const granted = await requestPermission();
    setLoading(false);
    
    if (granted) {
      toast.success('¡Notificaciones push activadas!');
    } else {
      toast.error('No se pudieron activar las notificaciones');
    }
  };

  const testSound = () => {
    soundManager.playBookingSound();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Notificaciones
        </CardTitle>
        <CardDescription>
          Configura cómo quieres recibir notificaciones de nuevas reservas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-primary" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="sound-toggle" className="font-medium">
                Sonidos de notificación
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduce un sonido cuando recibes nuevas reservas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testSound}
              disabled={!soundEnabled}
            >
              Probar
            </Button>
            <Switch
              id="sound-toggle"
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>
        </div>

        {/* Push Notification Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasPermission ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <Label className="font-medium">
                Notificaciones push
              </Label>
              <p className="text-sm text-muted-foreground">
                Recibe notificaciones aunque la app esté en segundo plano
              </p>
            </div>
          </div>
          {hasPermission ? (
            <span className="text-sm text-success font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Activadas
            </span>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRequestPermission}
              disabled={loading}
            >
              {loading ? 'Activando...' : 'Activar'}
            </Button>
          )}
        </div>

        {hasPermission === false && (
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            💡 Para activar las notificaciones push, permite las notificaciones en la configuración de tu navegador.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
