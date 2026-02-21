import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { PatientList } from '@/components/patients/PatientList';
import { Agenda } from '@/components/agenda/Agenda';
import { Header } from '@/components/layout/Header';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Settings, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    patients,
    loading: patientsLoading,
    loadingProgress,
    loadingStatus,
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
    const safeProgress = Math.max(0, Math.min(100, Math.round(loadingProgress || 0)));

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-xl space-y-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="font-medium text-foreground">Preparando seu CRM</p>
            <p className="text-sm text-muted-foreground">{loadingStatus || 'Carregando dados...'}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso de preload</span>
              <span>{safeProgress}%</span>
            </div>
            <Progress value={safeProgress} className="h-2" />
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Status do projeto: importação CSV e sincronização Calendly ativas. O sistema está carregando sua base de pacientes e sessões em lotes para evitar travamentos.
          </div>
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

      case 'kanban':
        return (
          <KanbanBoard
            patients={patients}
            onUpdatePatient={updatePatient}
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
