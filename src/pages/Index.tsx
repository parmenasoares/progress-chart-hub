import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { PatientList } from '@/components/patients/PatientList';
import { Header } from '@/components/layout/Header';
import { mockPatients } from '@/data/mockPatients';
import { Patient } from '@/types/patient';
import { Calendar, Settings } from 'lucide-react';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [patients, setPatients] = useState<Patient[]>(mockPatients);

  const handleAddPatient = (data: Partial<Patient>) => {
    const newPatient: Patient = {
      ...data,
      id: crypto.randomUUID(),
      completedSessions: data.completedSessions || 0,
      treatmentStatus: data.treatmentStatus || 'novo',
      financialStatus: data.financialStatus || 'pendente',
      sessionHistory: data.sessionHistory || [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    } as Patient;
    
    setPatients(prev => [newPatient, ...prev]);
  };

  const handleUpdatePatient = (data: Partial<Patient>) => {
    setPatients(prev => prev.map(p => 
      p.id === data.id 
        ? { ...p, ...data, updatedAt: new Date().toISOString().split('T')[0] }
        : p
    ));
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <>
            <Header title="Dashboard" subtitle="Bem-vindo ao FisioGestão" />
            <Dashboard patients={patients} />
          </>
        );
      case 'patients':
        return (
          <PatientList 
            patients={patients} 
            onAddPatient={handleAddPatient}
            onUpdatePatient={handleUpdatePatient}
          />
        );
      case 'calendar':
        return (
          <>
            <Header title="Agenda" subtitle="Em breve" />
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground">Agenda em Desenvolvimento</h2>
              <p className="text-muted-foreground mt-2">Esta funcionalidade estará disponível em breve.</p>
            </div>
          </>
        );
      case 'settings':
        return (
          <>
            <Header title="Configurações" subtitle="Personalize sua experiência" />
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Settings className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground">Configurações em Desenvolvimento</h2>
              <p className="text-muted-foreground mt-2">Esta funcionalidade estará disponível em breve.</p>
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
