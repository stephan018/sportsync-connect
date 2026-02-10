import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { BookingNotificationProvider } from "@/components/notifications/BookingNotificationProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherAvailability from "./pages/teacher/Availability";
import TeacherCalendar from "./pages/teacher/Calendar";
import TeacherEarnings from "./pages/teacher/Earnings";
import TeacherSettings from "./pages/teacher/Settings";
import BrowseTeachers from "./pages/student/BrowseTeachers";
import TeacherProfile from "./pages/student/TeacherProfile";
import BookingPage from "./pages/student/BookingPage";
import MyBookings from "./pages/student/MyBookings";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import PublicTeacherProfile from "./pages/PublicTeacherProfile";
import InstallPrompt from "./components/pwa/InstallPrompt";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles, skipOnboardingCheck }: { children: React.ReactNode; allowedRoles?: ('teacher' | 'student')[]; skipOnboardingCheck?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!skipOnboardingCheck && !profile.is_onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'teacher' ? '/dashboard' : '/browse'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute skipOnboardingCheck>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      
      {/* Teacher Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/availability"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherAvailability />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/calendar"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/earnings"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherEarnings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherSettings />
          </ProtectedRoute>
        }
      />
      
      {/* Student Routes */}
      <Route
        path="/browse"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <BrowseTeachers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/:teacherId"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <TeacherProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book/:teacherId"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <BookingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <MyBookings />
          </ProtectedRoute>
        }
      />

      {/* Shared Routes */}
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BookingNotificationProvider>
            <AppRoutes />
          </BookingNotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
