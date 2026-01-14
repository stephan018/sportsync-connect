import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedAvatar } from '@/components/ui/optimized-image';
import MessageInput from './MessageInput';
import { cn } from '@/lib/utils';
import type { Message, Profile } from '@/types/database';

interface ChatRoomProps {
  messages: Message[];
  currentUserId: string | undefined;
  otherUser: Profile | undefined;
  onSendMessage: (content: string) => Promise<boolean>;
  onBack?: () => void;
  loading?: boolean;
}

export default function ChatRoom({
  messages,
  currentUserId,
  otherUser,
  onSendMessage,
  onBack,
  loading
}: ChatRoomProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">Selecciona una conversación</h3>
        <p className="text-sm text-muted-foreground">
          Elige una conversación de la barra lateral para comenzar a chatear
        </p>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    return role === 'teacher' ? 'Profesor' : 'Estudiante';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <OptimizedAvatar
          src={otherUser.avatar_url}
          alt={otherUser.full_name}
          fallback={otherUser.full_name.charAt(0)}
          size="md"
        />
        <div>
          <h3 className="font-semibold text-foreground">{otherUser.full_name}</h3>
          <p className="text-xs text-muted-foreground">{getRoleLabel(otherUser.role)}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">
              Aún no hay mensajes. ¡Inicia la conversación!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2',
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {format(new Date(message.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
}
