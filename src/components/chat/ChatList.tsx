import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedAvatar } from '@/components/ui/optimized-image';
import type { ChatRoomWithDetails } from '@/hooks/useChat';

interface ChatListProps {
  rooms: ChatRoomWithDetails[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

export default function ChatList({ rooms, selectedRoomId, onSelectRoom }: ChatListProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">Aún no hay conversaciones</h3>
        <p className="text-sm text-muted-foreground">
          Inicia una conversación reservando una sesión con un profesor
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Mensajes</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className={cn(
              'w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border',
              selectedRoomId === room.id && 'bg-muted'
            )}
          >
            <OptimizedAvatar
              src={room.otherUser?.avatar_url}
              alt={room.otherUser?.full_name || 'Usuario'}
              fallback={room.otherUser?.full_name?.charAt(0) || 'U'}
              size="lg"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground truncate">
                  {room.otherUser?.full_name || 'Usuario Desconocido'}
                </span>
                {room.lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(room.lastMessage.created_at), "d 'de' MMM", { locale: es })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {room.lastMessage?.content || 'Sin mensajes aún'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
