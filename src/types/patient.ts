export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  
  // Sales Funnel
  leadSource: string;
  scheduledAppointment: boolean;
  nonConversionReason?: string;
  
  // Clinical Data
  mainComplaint?: string;
  diagnosis?: string;
  treatmentObjective?: string;
  suggestedSessions?: number;
  completedSessions: number;
  treatmentStatus: TreatmentStatus;
  
  // Financial
  paymentModality: string;
  sessionValue?: number;
  financialStatus: FinancialStatus;
  
  // Documentation
  anamnesisLink?: string;
  lastEvolutionDate?: string;
  sessionHistory: string[];
  
  // Notes
  quickContext?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type TreatmentStatus = 
  | 'em_tratamento' 
  | 'alta_sucesso' 
  | 'abandono' 
  | 'aguardando_retorno'
  | 'novo';

export type FinancialStatus = 'pago' | 'pendente' | 'reembolso';

export const LEAD_SOURCES = [
  'Indicações',
  'Redes Sociais',
  'Convênio',
  'Pesquisa no Google',
  'Site/Landing Page',
  'Outros',
];

export const NON_CONVERSION_REASONS = [
  'Preço',
  'Horário incompatível',
  'Distância',
  'Optou por outro profissional',
  'Desistiu do tratamento',
  'Outros',
];

export const PAYMENT_MODALITIES = [
  'Particular',
  'Convênio',
  'Pacote (10 sessões)',
  'Pacote (20 sessões)',
  'Plano mensal',
];

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  novo: 'Novo Paciente',
  em_tratamento: 'Em Tratamento',
  alta_sucesso: 'Alta (Sucesso)',
  abandono: 'Abandono',
  aguardando_retorno: 'Aguardando Retorno',
};

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  reembolso: 'Reembolso a processar',
};
