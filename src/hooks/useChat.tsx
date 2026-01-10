import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { ChatRoom, Message, Profile } from '@/types/database';

export interface ChatRoomWithDetails extends ChatRoom {
  otherUser: Profile;
  lastMessage?: Message;
  unreadCount?: number;
}

export function useChat() {
  const { profile } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChatRooms = useCallback(async () => {
    if (!profile) return;

    try {
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`student_id.eq.${profile.id},teacher_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch other users and last messages for each room
      const roomsWithDetails = await Promise.all(
        (rooms || []).map(async (room) => {
          const otherUserId = room.student_id === profile.id ? room.teacher_id : room.student_id;
          
          const [userResult, messageResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', otherUserId).single(),
            supabase
              .from('messages')
              .select('*')
              .eq('chat_room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          ]);

          return {
            ...room,
            otherUser: userResult.data as Profile,
            lastMessage: messageResult.data as Message | undefined
          };
        })
      );

      setChatRooms(roomsWithDetails);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  const getOrCreateChatRoom = async (teacherId: string, studentId: string): Promise<string | null> => {
    try {
      // Check if room exists
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingRoom) return existingRoom.id;

      // Create new room
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({ teacher_id: teacherId, student_id: studentId })
        .select('id')
        .single();

      if (error) throw error;
      
      await fetchChatRooms();
      return newRoom.id;
    } catch (error) {
      console.error('Error creating chat room:', error);
      return null;
    }
  };

  return { chatRooms, loading, fetchChatRooms, getOrCreateChatRoom };
}

export function useChatMessages(roomId: string | null) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async (content: string) => {
    if (!roomId || !profile || !content.trim()) return false;

    try {
      const { error } = await supabase.from('messages').insert({
        chat_room_id: roomId,
        sender_id: profile.id,
        content: content.trim()
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  return { messages, loading, sendMessage, currentUserId: profile?.id };
}
