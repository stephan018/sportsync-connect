export type AppRole = 'teacher' | 'student';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';

export interface Profile {
  id: string;
  user_id: string;
  role: AppRole;
  full_name: string;
  slug: string | null;
  bio: string | null;
  hourly_rate: number;
  group_hourly_rate: number | null;
  max_students_per_session: number | null;
  session_duration: number | null;
  avatar_url: string | null;
  sport: string | null;
  gallery_images: string[] | null;
  is_onboarded: boolean;
  years_of_experience: number | null;
  average_rating: number;
  total_reviews: number;
  location: string | null;
  skill_level: string | null;
  sports_interests: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  teacher_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  student_id: string;
  teacher_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatRoom {
  id: string;
  student_id: string;
  teacher_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  student_id: string;
  teacher_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReviewWithStudent extends Review {
  student: Profile;
}

// Extended types with relations
export interface BookingWithProfiles extends Booking {
  student: Profile;
  teacher: Profile;
}

export interface ChatRoomWithProfiles extends ChatRoom {
  student: Profile;
  teacher: Profile;
  messages?: Message[];
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;
