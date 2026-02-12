import DashboardLayout from '@/components/layout/DashboardLayout';
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection';

export default function StudentSettings() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Administra tu cuenta
          </p>
        </div>
        <div className="max-w-2xl space-y-6">
          <DeleteAccountSection />
        </div>
      </div>
    </DashboardLayout>
  );
}
