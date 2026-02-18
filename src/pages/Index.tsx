import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { PatientList } from '@/components/patients/PatientList';
import { Agenda } from '@/components/agenda/Agenda';
import { Header } from '@/components/layout/Header';
import { Settings, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    patients,
    loading: patientsLoading,
    addPatient,
    updatePatient,
  } = usePatients(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || (user && patientsLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <>
            <Header
              title="Dashboard"
              subtitle="Bem-vindo ao FisioGestão"
              rightContent={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              }
            />
            <Dashboard patients={patients} />
          </>
        );
      case 'patients':
        return (
          <PatientList
            patients={patients}
            onAddPatient={addPatient}
            onUpdatePatient={updatePatient}
          />
        );
      case 'calendar':
        return (
          <Agenda
            patients={patients}
            onUpdatePatient={updatePatient}
            onAddPatient={addPatient}
            userId={user?.id}
          />
        );
      case 'settings':
        return (
          <>
            <Header title="Configurações" subtitle="Personalize sua experiência" />
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Settings className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Configurações em Desenvolvimento
              </h2>
              <p className="text-muted-foreground mt-2">
                Esta funcionalidade estará disponível em breve.
              </p>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="min-h-screen pb-16 md:ml-64 md:pb-0">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
