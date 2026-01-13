import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Dumbbell,
  Users,
  LayoutDashboard,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isTeacher = profile?.role === 'teacher';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const teacherNavItems = [
    { icon: LayoutDashboard, label: 'Panel', path: '/dashboard' },
    { icon: Calendar, label: 'Calendario', path: '/dashboard/calendar' },
    { icon: Clock, label: 'Disponibilidad', path: '/dashboard/availability' },
    { icon: DollarSign, label: 'Ganancias', path: '/dashboard/earnings' },
    { icon: MessageSquare, label: 'Mensajes', path: '/dashboard/messages' },
    { icon: Settings, label: 'Configuración', path: '/dashboard/settings' },
  ];

  const studentNavItems = [
    { icon: Search, label: 'Buscar Profesores', path: '/browse' },
    { icon: Calendar, label: 'Mis Reservas', path: '/bookings' },
    { icon: MessageSquare, label: 'Mensajes', path: '/messages' },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">ProffX</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <Users className="w-5 h-5 text-sidebar-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {profile?.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
