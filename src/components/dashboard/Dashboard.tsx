import { Users, TrendingUp, Calendar, DollarSign, UserCheck, UserX } from 'lucide-react';
import { StatCard } from './StatCard';
import { Patient } from '@/types/patient';

interface DashboardProps {
  patients: Patient[];
}

export function Dashboard({ patients }: DashboardProps) {
  const totalPatients = patients.length;
  const activePatients = patients.filter(p => p.treatmentStatus === 'em_tratamento').length;
  const completedTreatments = patients.filter(p => p.treatmentStatus === 'alta_sucesso').length;
  const abandonedTreatments = patients.filter(p => p.treatmentStatus === 'abandono').length;
  
  const totalSessions = patients.reduce((acc, p) => acc + p.completedSessions, 0);
  
  const pendingPayments = patients.filter(p => p.financialStatus === 'pendente').length;
  
  const conversionRate = patients.length > 0 
    ? Math.round((patients.filter(p => p.scheduledAppointment).length / patients.length) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground">Visão Geral</h2>
        <p className="text-muted-foreground">Acompanhe os principais indicadores da sua clínica</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Pacientes"
          value={totalPatients}
          subtitle="cadastrados"
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Em Tratamento"
          value={activePatients}
          subtitle="pacientes ativos"
          icon={UserCheck}
          variant="success"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Sessões Realizadas"
          value={totalSessions}
          subtitle="este período"
          icon={Calendar}
          variant="accent"
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${conversionRate}%`}
          subtitle="leads → pacientes"
          icon={TrendingUp}
          variant="default"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Alta com Sucesso"
          value={completedTreatments}
          subtitle="tratamentos concluídos"
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="Abandonos"
          value={abandonedTreatments}
          subtitle="tratamentos interrompidos"
          icon={UserX}
          variant="warning"
        />
        <StatCard
          title="Pagamentos Pendentes"
          value={pendingPayments}
          subtitle="aguardando regularização"
          icon={DollarSign}
          variant="warning"
        />
      </div>

      {/* Lead Sources Summary */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-foreground">Origem dos Leads</h3>
        <p className="text-sm text-muted-foreground mb-4">De onde vêm seus pacientes</p>
        
        <div className="space-y-3">
          {['Indicações', 'Pesquisa no Google', 'Redes Sociais', 'Convênio'].map((source) => {
            const count = patients.filter(p => p.leadSource === source).length;
            const percentage = patients.length > 0 ? (count / patients.length) * 100 : 0;
            
            return (
              <div key={source} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{source}</span>
                  <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
