import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient, SessionEntry, TreatmentStatus, FinancialStatus } from '@/types/patient';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type DbPatient = Tables<'patients'>;
type DbSession = Tables<'sessions'>;


const PATIENT_SESSION_CHUNK_SIZE = 500;
const PATIENT_FETCH_PAGE_SIZE = 1000;
const LARGE_DATASET_PATIENT_THRESHOLD = 2000;

const chunkArray = <T,>(array: T[], chunkSize: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

const removeCityFromQuickContext = (value?: string) => {
  if (!value) return '';

  return value
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item && !/^Cidade\s*:/i.test(item))
    .join(' | ');
};

// Convert database patient to frontend Patient type
function dbToPatient(dbPatient: DbPatient, sessions: DbSession[] = []): Patient {
  const context = dbPatient.quick_context ?? '';
  const cityFromContext = context.match(/Cidade:\s*([^|]+)/i)?.[1]?.trim();

  const fallbackSessionsFromHistory: SessionEntry[] = (dbPatient.session_history ?? []).map((date, index) => ({
    id: `history-${dbPatient.id}-${index}`,
    date,
    notes: 'Sessão importada do histórico.',
    paid: false,
  }));

  const normalizedSessions = sessions.length > 0
    ? sessions.map(s => ({
      id: s.id,
      date: s.date,
      notes: s.notes ?? undefined,
      evolution: s.evolution ?? undefined,
      paid: s.paid,
    }))
    : fallbackSessionsFromHistory;

  return {
    id: dbPatient.id,
    name: dbPatient.name,
    phone: dbPatient.phone,
    city: cityFromContext || undefined,
    email: dbPatient.email ?? undefined,
    birthDate: dbPatient.birth_date ?? undefined,
    leadSource: dbPatient.lead_source,
    scheduledAppointment: dbPatient.scheduled_appointment,
    nonConversionReason: dbPatient.non_conversion_reason ?? undefined,
    mainComplaint: dbPatient.main_complaint ?? undefined,
    diagnosis: dbPatient.diagnosis ?? undefined,
    treatmentObjective: dbPatient.treatment_objective ?? undefined,
    suggestedSessions: dbPatient.suggested_sessions ?? undefined,
    completedSessions: dbPatient.completed_sessions,
    treatmentStatus: dbPatient.treatment_status as TreatmentStatus,
    paymentModality: dbPatient.payment_modality,
    sessionValue: dbPatient.session_value ?? undefined,
    financialStatus: dbPatient.financial_status as FinancialStatus,
    anamnesisLink: dbPatient.anamnesis_link ?? undefined,
    lastEvolutionDate: dbPatient.last_evolution_date ?? undefined,
    sessionHistory: dbPatient.session_history ?? [],
    sessions: normalizedSessions,
    quickContext: dbPatient.quick_context ?? undefined,
    createdAt: dbPatient.created_at,
    updatedAt: dbPatient.updated_at,
  };
}

export function usePatients(userId: string | undefined) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Iniciando carregamento...');
  const { toast } = useToast();

  const fetchPatients = useCallback(async () => {
    if (!userId) {
      setLoadingStatus('Usuário não autenticado.');
      setLoadingProgress(100);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadingProgress(5);
    setLoadingStatus('Carregando pacientes...');
    let hasError = false;

    try {
      const allPatients: DbPatient[] = [];
      let currentOffset = 0;
      let hasMorePatients = true;

      while (hasMorePatients) {
        const { data: pageData, error: pageError } = await supabase
          .from('patients')
          .select('*')
          .order('updated_at', { ascending: false })
          .range(currentOffset, currentOffset + PATIENT_FETCH_PAGE_SIZE - 1);

        if (pageError) throw pageError;

        const currentPage = pageData || [];
        allPatients.push(...currentPage);

        currentOffset += currentPage.length;
        hasMorePatients = currentPage.length === PATIENT_FETCH_PAGE_SIZE;

        setLoadingStatus(`Carregando pacientes... ${allPatients.length} registros`);
        setLoadingProgress(hasMorePatients ? 10 : 35);
      }

      if (allPatients.length === 0) {
        setPatients([]);
        setLoadingStatus('Nenhum paciente encontrado.');
        setLoadingProgress(100);
        setLoading(false);
        return;
      }

      let convertedPatients: Patient[] = [];

      if (allPatients.length > LARGE_DATASET_PATIENT_THRESHOLD) {
        setLoadingStatus('Base grande detectada, aplicando modo otimizado...');
        setLoadingProgress(60);

        convertedPatients = allPatients.map((p) => dbToPatient(p));

        toast({
          title: 'Base grande detectada',
          description: 'Carregamos a lista em modo otimizado para evitar travamento.',
        });
      } else {
        setLoadingStatus('Carregando sessões dos pacientes...');
        setLoadingProgress(45);

        const patientIds = allPatients.map((p) => p.id);
        const patientIdChunks = chunkArray(patientIds, PATIENT_SESSION_CHUNK_SIZE);
        const allSessions: DbSession[] = [];

        const totalChunks = patientIdChunks.length || 1;

        for (let chunkIndex = 0; chunkIndex < patientIdChunks.length; chunkIndex += 1) {
          const idsChunk = patientIdChunks[chunkIndex];
          const { data: chunkSessions, error: chunkError } = await supabase
            .from('sessions')
            .select('*')
            .in('patient_id', idsChunk)
            .order('date', { ascending: false });

          if (chunkError) throw chunkError;

          if (chunkSessions && chunkSessions.length > 0) {
            allSessions.push(...chunkSessions);
          }

          const chunkProgress = 45 + Math.round(((chunkIndex + 1) / totalChunks) * 45);
          setLoadingProgress(Math.min(chunkProgress, 92));
          setLoadingStatus(`Carregando sessões... ${chunkIndex + 1}/${totalChunks}`);
        }

        const sessionsByPatient = allSessions.reduce((acc, session) => {
          if (!acc[session.patient_id]) {
            acc[session.patient_id] = [];
          }
          acc[session.patient_id].push(session);
          return acc;
        }, {} as Record<string, DbSession[]>);

        convertedPatients = allPatients.map((p) =>
          dbToPatient(p, sessionsByPatient[p.id] || [])
        );
      }

      setLoadingStatus('Finalizando preload dos dados...');
      setLoadingProgress(98);
      setPatients(convertedPatients);
    } catch (error) {
      hasError = true;
      console.error('Error fetching patients:', error);
      toast({
        title: 'Erro ao carregar pacientes',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoadingProgress(100);
      setLoadingStatus(hasError ? 'Erro ao carregar dados.' : 'Dados carregados com sucesso.');
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const addPatient = async (data: Partial<Patient>) => {
    if (!userId) return;

    try {
      const quickContextWithoutCity = removeCityFromQuickContext(data.quickContext);
      const normalizedQuickContext = [
        data.city ? `Cidade: ${data.city}` : null,
        quickContextWithoutCity || null,
      ].filter(Boolean).join(' | ');

      const insertData: TablesInsert<'patients'> = {
        user_id: userId,
        name: data.name!,
        phone: data.phone!,
        email: data.email || null,
        birth_date: data.birthDate || null,
        lead_source: data.leadSource || 'Outros',
        scheduled_appointment: data.scheduledAppointment ?? false,
        non_conversion_reason: data.nonConversionReason || null,
        main_complaint: data.mainComplaint || null,
        diagnosis: data.diagnosis || null,
        treatment_objective: data.treatmentObjective || null,
        suggested_sessions: data.suggestedSessions || null,
        completed_sessions: data.completedSessions || 0,
        treatment_status: (data.treatmentStatus || 'novo') as any,
        payment_modality: data.paymentModality || 'Particular',
        session_value: data.sessionValue || null,
        financial_status: (data.financialStatus || 'pendente') as any,
        anamnesis_link: data.anamnesisLink || null,
        last_evolution_date: data.lastEvolutionDate || null,
        session_history: data.sessionHistory || [],
        quick_context: normalizedQuickContext || null,
      };

      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Insert sessions if any
      if (data.sessions && data.sessions.length > 0) {
        const sessionsInsert = data.sessions.map(s => ({
          patient_id: newPatient.id,
          date: s.date,
          notes: s.notes || null,
          evolution: s.evolution || null,
          paid: s.paid,
        }));

        const { error: sessionsError } = await supabase
          .from('sessions')
          .insert(sessionsInsert);

        if (sessionsError) throw sessionsError;
      }

      toast({
        title: 'Paciente cadastrado',
        description: `${data.name} foi adicionado com sucesso.`,
      });

      await fetchPatients();
    } catch (error) {
      console.error('Error adding patient:', error);
      toast({
        title: 'Erro ao cadastrar paciente',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const updatePatient = async (data: Partial<Patient>) => {
    if (!userId || !data.id) return;

    try {
      const quickContextWithoutCity = removeCityFromQuickContext(data.quickContext);
      const normalizedQuickContext = [
        data.city ? `Cidade: ${data.city}` : null,
        quickContextWithoutCity || null,
      ].filter(Boolean).join(' | ');

      const updateData: TablesUpdate<'patients'> = {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        birth_date: data.birthDate || null,
        lead_source: data.leadSource,
        scheduled_appointment: data.scheduledAppointment,
        non_conversion_reason: data.nonConversionReason || null,
        main_complaint: data.mainComplaint || null,
        diagnosis: data.diagnosis || null,
        treatment_objective: data.treatmentObjective || null,
        suggested_sessions: data.suggestedSessions || null,
        completed_sessions: data.completedSessions,
        treatment_status: data.treatmentStatus as any,
        payment_modality: data.paymentModality,
        session_value: data.sessionValue || null,
        financial_status: data.financialStatus as any,
        anamnesis_link: data.anamnesisLink || null,
        last_evolution_date: data.lastEvolutionDate || null,
        session_history: data.sessionHistory || [],
        quick_context: normalizedQuickContext || null,
      };

      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;

      // Handle sessions update
      if (data.sessions) {
        // Delete existing sessions and recreate
        await supabase
          .from('sessions')
          .delete()
          .eq('patient_id', data.id);

        if (data.sessions.length > 0) {
          const sessionsInsert = data.sessions.map(s => ({
            patient_id: data.id!,
            date: s.date,
            notes: s.notes || null,
            evolution: s.evolution || null,
            paid: s.paid,
          }));

          const { error: sessionsError } = await supabase
            .from('sessions')
            .insert(sessionsInsert);

          if (sessionsError) throw sessionsError;
        }
      }

      toast({
        title: 'Paciente atualizado',
        description: 'As informações foram salvas com sucesso.',
      });

      await fetchPatients();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: 'Erro ao atualizar paciente',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const deletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: 'Paciente removido',
        description: 'O paciente foi excluído com sucesso.',
      });

      await fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Erro ao excluir paciente',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  return {
    patients,
    loading,
    loadingProgress,
    loadingStatus,
    addPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
}
