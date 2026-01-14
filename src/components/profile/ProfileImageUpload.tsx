import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { OptimizedAvatar } from '@/components/ui/optimized-image';
import { toast } from 'sonner';
import { Camera, Loader2, Upload, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileImageUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  fullName: string;
  onAvatarChange: (url: string) => void;
}

export function ProfileImageUpload({
  userId,
  currentAvatarUrl,
  fullName,
  onAvatarChange,
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onAvatarChange(publicUrl);
      toast.success('¡Foto de perfil actualizada!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Error al subir la imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20">
          {currentAvatarUrl ? (
            <OptimizedAvatar
              src={currentAvatarUrl}
              alt={fullName}
              fallback={fullName.charAt(0)}
              className="w-28 h-28"
            />
          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center text-4xl font-bold text-primary-foreground">
              {fullName.charAt(0)}
            </div>
          )}
        </div>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <Camera className="w-8 h-8 text-white" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Cambiar foto
          </>
        )}
      </Button>
    </div>
  );
}

interface GalleryUploadProps {
  userId: string;
  galleryImages: string[];
  onGalleryChange: (images: string[]) => void;
}

export function GalleryUpload({
  userId,
  galleryImages,
  onGalleryChange,
}: GalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    if (galleryImages.length >= 6) {
      toast.error('Máximo 6 fotos en la galería');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `gallery-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const newImages = [...galleryImages, urlData.publicUrl];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ gallery_images: newImages })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onGalleryChange(newImages);
      toast.success('¡Foto agregada a la galería!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Error al subir la imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    setDeletingIndex(index);
    try {
      const imageUrl = galleryImages[index];
      const newImages = galleryImages.filter((_, i) => i !== index);

      // Try to delete from storage
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      const filePath = `${userId}/${fileName}`;
      
      await supabase.storage
        .from('profile-images')
        .remove([filePath]);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ gallery_images: newImages })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onGalleryChange(newImages);
      toast.success('Foto eliminada');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Error al eliminar la imagen');
    } finally {
      setDeletingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {galleryImages.map((url, index) => (
          <div
            key={url}
            className="relative aspect-[4/3] rounded-lg overflow-hidden group bg-muted"
          >
            <img
              src={url}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleDelete(index)}
              disabled={deletingIndex === index}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {deletingIndex === index ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}

        {galleryImages.length < 6 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Agregar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground text-center">
        Máximo 6 fotos · Cada imagen debe ser menor a 5MB
      </p>
    </div>
  );
}
