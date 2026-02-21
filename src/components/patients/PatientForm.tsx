import { useState, useEffect } from 'react';
import { 
  Patient, 
  TreatmentStatus, 
  FinancialStatus,
  SessionEntry,
  LEAD_SOURCES, 
  NON_CONVERSION_REASONS, 
  PAYMENT_MODALITIES,
  TREATMENT_STATUS_LABELS,
  FINANCIAL_STATUS_LABELS,
} from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SessionHistoryManager } from './SessionHistoryManager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, User, Stethoscope, DollarSign, FileText, Lightbulb, ClipboardList } from 'lucide-react';

interface PatientFormProps {
  patient?: Patient | null;
  onSubmit: (data: Partial<Patient>) => void;
  onClose: () => void;
}

export function PatientForm({ patient, onSubmit, onClose }: PatientFormProps) {
  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    phone: '',
    city: '',
    email: '',
    birthDate: '',
    leadSource: '',
    scheduledAppointment: false,
    nonConversionReason: '',
    mainComplaint: '',
    diagnosis: '',
    treatmentObjective: '',
    suggestedSessions: undefined,
    treatmentStatus: 'novo',
    paymentModality: '',
    sessionValue: undefined,
    financialStatus: 'pendente',
    anamnesisLink: '',
    quickContext: '',
    sessionHistory: [],
    sessions: [],
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        ...patient,
        sessions: patient.sessions || [],
      });
    }
  }, [patient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessions = formData.sessions || [];
    onSubmit({
      ...formData,
      completedSessions: sessions.length,
      lastEvolutionDate: sessions.length > 0 
        ? sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : formData.lastEvolutionDate,
    });
  };

  const updateField = <K extends keyof Patient>(field: K, value: Patient[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSessionsChange = (sessions: SessionEntry[]) => {
    setFormData(prev => ({ ...prev, sessions }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-lg animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-2xl font-semibold text-foreground mb-6">
          {patient ? 'Editar Paciente' : 'Novo Paciente'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-medium text-foreground">Dados Básicos</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Nome do paciente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Ex.: Belo Horizonte"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={(e) => updateField('birthDate', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Sales Funnel */}
          <section className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-medium text-foreground">Funil de Vendas</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fonte de Captação *</Label>
                <Select
                  value={formData.leadSource}
                  onValueChange={(value) => updateField('leadSource', value)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Realizou Agendamento?</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={formData.scheduledAppointment}
                    onCheckedChange={(checked) => updateField('scheduledAppointment', checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.scheduledAppointment ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>

              {!formData.scheduledAppointment && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Motivo da Não Conversão</Label>
                  <Select
                    value={formData.nonConversionReason || ''}
                    onValueChange={(value) => updateField('nonConversionReason', value)}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Por que não converteu?" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {NON_CONVERSION_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* Clinical Data */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-success" />
              <h3 className="font-display text-lg font-medium text-foreground">Dados Clínicos</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mainComplaint">Queixa Principal</Label>
                <Input
                  id="mainComplaint"
                  value={formData.mainComplaint || ''}
                  onChange={(e) => updateField('mainComplaint', e.target.value)}
                  placeholder="O que levou à fisioterapia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnóstico / CID</Label>
                <Input
                  id="diagnosis"
                  value={formData.diagnosis || ''}
                  onChange={(e) => updateField('diagnosis', e.target.value)}
                  placeholder="Ex: Lombalgia, Tendinite..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treatmentObjective">Objetivo do Tratamento</Label>
                <Input
                  id="treatmentObjective"
                  value={formData.treatmentObjective || ''}
                  onChange={(e) => updateField('treatmentObjective', e.target.value)}
                  placeholder="Ex: Alívio da dor, Recuperação..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestedSessions">Sessões Sugeridas</Label>
                <Input
                  id="suggestedSessions"
                  type="number"
                  min="0"
                  value={formData.suggestedSessions || ''}
                  onChange={(e) => updateField('suggestedSessions', parseInt(e.target.value) || undefined)}
                  placeholder="Ex: 10"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Status do Tratamento</Label>
                <Select
                  value={formData.treatmentStatus}
                  onValueChange={(value) => updateField('treatmentStatus', value as TreatmentStatus)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {(Object.keys(TREATMENT_STATUS_LABELS) as TreatmentStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {TREATMENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Session History */}
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-medium text-foreground">Histórico de Sessões</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                Insira as datas e detalhes de cada sessão realizada
              </span>
            </div>
            <SessionHistoryManager
              sessions={formData.sessions || []}
              onChange={handleSessionsChange}
            />
          </section>

          {/* Financial */}
          <section className="rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-warning" />
              <h3 className="font-display text-lg font-medium text-foreground">Dados Financeiros</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Modalidade de Pagamento</Label>
                <Select
                  value={formData.paymentModality || ''}
                  onValueChange={(value) => updateField('paymentModality', value)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {PAYMENT_MODALITIES.map((modality) => (
                      <SelectItem key={modality} value={modality}>
                        {modality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionValue">Valor (R$)</Label>
                <Input
                  id="sessionValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sessionValue || ''}
                  onChange={(e) => updateField('sessionValue', parseFloat(e.target.value) || undefined)}
                  placeholder="180.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Status Financeiro</Label>
                <Select
                  value={formData.financialStatus}
                  onValueChange={(value) => updateField('financialStatus', value as FinancialStatus)}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {(Object.keys(FINANCIAL_STATUS_LABELS) as FinancialStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {FINANCIAL_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Documentation */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-medium text-foreground">Documentação</h3>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="anamnesisLink">Link da Anamnese</Label>
                <Input
                  id="anamnesisLink"
                  type="url"
                  value={formData.anamnesisLink || ''}
                  onChange={(e) => updateField('anamnesisLink', e.target.value)}
                  placeholder="https://forms.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickContext">Contexto Rápido do Paciente</Label>
                <Textarea
                  id="quickContext"
                  value={formData.quickContext || ''}
                  onChange={(e) => updateField('quickContext', e.target.value)}
                  placeholder="Anotações rápidas e contextuais. Ex: 'Indicado por Dr. João. Foco em dor crônica lombar. Necessita de acompanhamento com exercícios em casa.'"
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
