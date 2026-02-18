import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient, SessionEntry, TreatmentStatus, FinancialStatus } from '@/types/patient';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type DbPatient = Tables<'patients'>;
type DbSession = Tables<'sessions'>;


const PATIENT_SESSION_CHUNK_SIZE = 500;

const chunkArray = <T,>(array: T[], chunkSize: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

// Convert database patient to frontend Patient type
function dbToPatient(dbPatient: DbPatient, sessions: DbSession[]): Patient {
  return {
    id: dbPatient.id,
    name: dbPatient.name,
    phone: dbPatient.phone,
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
    sessions: sessions.map(s => ({
      id: s.id,
      date: s.date,
      notes: s.notes ?? undefined,
      evolution: s.evolution ?? undefined,
      paid: s.paid,
    })),
    quickContext: dbPatient.quick_context ?? undefined,
    createdAt: dbPatient.created_at,
    updatedAt: dbPatient.updated_at,
  };
}

export function usePatients(userId: string | undefined) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPatients = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .order('updated_at', { ascending: false });

      if (patientsError) throw patientsError;

      if (!patientsData || patientsData.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const patientIds = patientsData.map((p) => p.id);
      const patientIdChunks = chunkArray(patientIds, PATIENT_SESSION_CHUNK_SIZE);
      const allSessions: DbSession[] = [];

      for (const idsChunk of patientIdChunks) {
        const { data: chunkSessions, error: chunkError } = await supabase
          .from('sessions')
          .select('*')
          .in('patient_id', idsChunk)
          .order('date', { ascending: false });

        if (chunkError) throw chunkError;

        if (chunkSessions && chunkSessions.length > 0) {
          allSessions.push(...chunkSessions);
        }
      }

      const sessionsByPatient = allSessions.reduce((acc, session) => {
        if (!acc[session.patient_id]) {
          acc[session.patient_id] = [];
        }
        acc[session.patient_id].push(session);
        return acc;
      }, {} as Record<string, DbSession[]>);

      const convertedPatients = patientsData.map(p => 
        dbToPatient(p, sessionsByPatient[p.id] || [])
      );

      setPatients(convertedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: 'Erro ao carregar pacientes',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const addPatient = async (data: Partial<Patient>) => {
    if (!userId) return;

    try {
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
        quick_context: data.quickContext || null,
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
        quick_context: data.quickContext || null,
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
    addPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
}
