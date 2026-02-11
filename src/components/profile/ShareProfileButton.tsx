import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check, Copy, Link } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareProfileButtonProps {
  slug: string | null;
  profileId: string;
  fullName: string;
}

export default function ShareProfileButton({ slug, profileId, fullName }: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  const getProfileUrl = () => {
    const base = window.location.origin;
    return slug ? `${base}/profe/${slug}` : `${base}/teacher/${profileId}`;
  };

  const handleCopyLink = async () => {
    const url = getProfileUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('¡Enlace copiado al portapapeles!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const handleNativeShare = async () => {
    const url = getProfileUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fullName} - AceX`,
          text: `¡Reserva una clase con ${fullName} en AceX!`,
          url,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsApp = () => {
    const url = getProfileUrl();
    const text = encodeURIComponent(`¡Mira el perfil de ${fullName} en SportSync! ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Compartir Perfil
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          Copiar enlace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleNativeShare} className="gap-2 cursor-pointer">
          <Share2 className="w-4 h-4" />
          Compartir...
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsApp} className="gap-2 cursor-pointer">
          <Link className="w-4 h-4" />
          WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
