import { Patient, TREATMENT_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from '@/types/patient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SessionHistoryManager } from './SessionHistoryManager';
import { 
  X, 
  Phone, 
  Mail, 
  Calendar, 
  Stethoscope, 
  DollarSign, 
  FileText,
  ExternalLink,
  Edit,
  ClipboardList
} from 'lucide-react';

interface PatientDetailProps {
  patient: Patient;
  onClose: () => void;
  onEdit: () => void;
  onUpdatePatient?: (patient: Patient) => void;
}

export function PatientDetail({ patient, onClose, onEdit, onUpdatePatient }: PatientDetailProps) {
  const sessionsProgress = patient.suggestedSessions 
    ? (patient.completedSessions / patient.suggestedSessions) * 100 
    : 0;

  const handleSessionsChange = (sessions: Patient['sessions']) => {
    if (onUpdatePatient) {
      onUpdatePatient({
        ...patient,
        sessions,
        completedSessions: sessions.length,
        lastEvolutionDate: sessions.length > 0 
          ? sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : patient.lastEvolutionDate,
        updatedAt: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card shadow-lg animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">{patient.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={patient.treatmentStatus}>
                {TREATMENT_STATUS_LABELS[patient.treatmentStatus]}
              </Badge>
              <Badge variant={patient.financialStatus}>
                {FINANCIAL_STATUS_LABELS[patient.financialStatus]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <section className="flex flex-wrap gap-4">
            <a 
              href={`tel:${patient.phone}`}
              className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Phone className="h-4 w-4 text-primary" />
              {patient.phone}
            </a>
            {patient.email && (
              <a 
                href={`mailto:${patient.email}`}
                className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Mail className="h-4 w-4 text-primary" />
                {patient.email}
              </a>
            )}
            {patient.birthDate && (
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(patient.birthDate).toLocaleDateString('pt-BR')}
              </div>
            )}
          </section>

          {/* Quick Context */}
          {patient.quickContext && (
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary mb-1">Contexto Rápido</p>
              <p className="text-sm text-foreground">{patient.quickContext}</p>
            </section>
          )}

          {/* Clinical Info */}
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-success" />
              <h3 className="font-display text-lg font-medium text-foreground">Informações Clínicas</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {patient.mainComplaint && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Queixa Principal</p>
                  <p className="text-sm text-foreground">{patient.mainComplaint}</p>
                </div>
              )}
              {patient.diagnosis && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Diagnóstico</p>
                  <p className="text-sm text-foreground">{patient.diagnosis}</p>
                </div>
              )}
              {patient.treatmentObjective && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Objetivo do Tratamento</p>
                  <p className="text-sm text-foreground">{patient.treatmentObjective}</p>
                </div>
              )}
            </div>

            {/* Sessions Progress */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-foreground">Progresso das Sessões</p>
                <p className="text-sm text-muted-foreground">
                  {patient.sessions?.length || patient.completedSessions}
                  {patient.suggestedSessions && ` / ${patient.suggestedSessions}`}
                </p>
              </div>
              {patient.suggestedSessions && (
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-success transition-all duration-500"
                    style={{ width: `${Math.min(sessionsProgress, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Session History - Enhanced */}
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-medium text-foreground">Histórico de Sessões</h3>
            </div>
            <SessionHistoryManager 
              sessions={patient.sessions || []}
              onChange={handleSessionsChange}
              readOnly={!onUpdatePatient}
            />
          </section>

          {/* Financial */}
          <section className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-warning" />
              <h3 className="font-display text-lg font-medium text-foreground">Financeiro</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Modalidade</p>
                <p className="text-sm text-foreground">{patient.paymentModality || '-'}</p>
              </div>
              {patient.sessionValue && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Valor</p>
                  <p className="text-sm font-medium text-foreground">
                    R$ {patient.sessionValue.toFixed(2)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <Badge variant={patient.financialStatus} className="mt-1">
                  {FINANCIAL_STATUS_LABELS[patient.financialStatus]}
                </Badge>
              </div>
            </div>
          </section>

          {/* Documentation Links */}
          {patient.anamnesisLink && (
            <section className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-medium text-foreground">Documentação</h3>
              </div>
              <a
                href={patient.anamnesisLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir Anamnese
              </a>
            </section>
          )}

          {/* Metadata */}
          <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t border-border">
            <span>Cadastrado em: {new Date(patient.createdAt).toLocaleDateString('pt-BR')}</span>
            <span>Atualizado em: {new Date(patient.updatedAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
