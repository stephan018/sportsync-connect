import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ChatList from '@/components/chat/ChatList';
import ChatRoom from '@/components/chat/ChatRoom';
import { useChat, useChatMessages } from '@/hooks/useChat';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Messages() {
  const { chatRooms, loading: roomsLoading } = useChat();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  const selectedRoom = chatRooms.find(r => r.id === selectedRoomId);
  const { messages, loading: messagesLoading, sendMessage, currentUserId } = useChatMessages(selectedRoomId);

  if (roomsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-screen flex">
        {/* Chat List - hidden on mobile when a room is selected */}
        <div
          className={cn(
            'w-full md:w-80 lg:w-96 border-r border-border bg-card flex-shrink-0',
            selectedRoomId ? 'hidden md:block' : 'block'
          )}
        >
          <ChatList
            rooms={chatRooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
        </div>

        {/* Chat Room */}
        <div
          className={cn(
            'flex-1 bg-background',
            selectedRoomId ? 'block' : 'hidden md:block'
          )}
        >
          <ChatRoom
            messages={messages}
            currentUserId={currentUserId}
            otherUser={selectedRoom?.otherUser}
            onSendMessage={sendMessage}
            onBack={() => setSelectedRoomId(null)}
            loading={messagesLoading}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
