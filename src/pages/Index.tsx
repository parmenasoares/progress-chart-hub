import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { PatientList } from '@/components/patients/PatientList';
import { Agenda } from '@/components/agenda/Agenda';
import { Header } from '@/components/layout/Header';
import { Patient } from '@/types/patient';
import { Settings, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';

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

  // Referência para o input de arquivo
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manipulador para importar dados do CSV
  const handleImportCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedPatients = results.data as Patient[];
        importedPatients.forEach((p) => {
          addPatient(p);
        });
      },
      error: (error) => {
        console.error(error);
      },
    });
  };

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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Importar CSV
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleImportCSV}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
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
      <main className="ml-64 min-h-screen">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
