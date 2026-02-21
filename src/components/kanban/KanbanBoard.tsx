import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Patient, TreatmentStatus, TREATMENT_STATUS_LABELS } from '@/types/patient';

interface KanbanBoardProps {
  patients: Patient[];
  onUpdatePatient: (patient: Partial<Patient>) => void;
}

const KANBAN_COLUMNS: TreatmentStatus[] = [
  'novo',
  'em_tratamento',
  'aguardando_retorno',
  'alta_sucesso',
  'abandono',
];

export function KanbanBoard({ patients, onUpdatePatient }: KanbanBoardProps) {
  const [search, setSearch] = useState('');

  const filteredPatients = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return patients;

    return patients.filter((patient) =>
      [patient.name, patient.phone, patient.email || '']
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [patients, search]);

  const patientsByStatus = useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, status) => {
      acc[status] = filteredPatients.filter((patient) => patient.treatmentStatus === status);
      return acc;
    }, {} as Record<TreatmentStatus, Patient[]>);
  }, [filteredPatients]);

  const movePatient = (patient: Patient, nextStatus: TreatmentStatus) => {
    if (patient.treatmentStatus === nextStatus) return;

    onUpdatePatient({
      ...patient,
      treatmentStatus: nextStatus,
    });
  };

  return (
    <div className="flex-1">
      <Header title="Kanban" subtitle="Gerencie o funil de tratamento por etapa" />

      <div className="space-y-4 p-6">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar paciente por nome, telefone ou e-mail"
          className="max-w-xl"
        />

        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1100px] grid-cols-5 gap-4">
            {KANBAN_COLUMNS.map((status) => {
              const columnPatients = patientsByStatus[status] || [];

              return (
                <Card key={status} className="h-full">
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{TREATMENT_STATUS_LABELS[status]}</CardTitle>
                      <Badge variant="secondary">{columnPatients.length}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {columnPatients.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem pacientes nesta etapa.</p>
                    ) : (
                      columnPatients.map((patient) => (
                        <Card key={patient.id} className="border-border/70">
                          <CardContent className="space-y-3 p-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{patient.name}</p>
                              <p className="text-xs text-muted-foreground">{patient.phone}</p>
                              {patient.email && <p className="text-xs text-muted-foreground">{patient.email}</p>}
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {KANBAN_COLUMNS.filter((columnStatus) => columnStatus !== status).map((nextStatus) => (
                                <Button
                                  key={nextStatus}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[11px]"
                                  onClick={() => movePatient(patient, nextStatus)}
                                >
                                  {TREATMENT_STATUS_LABELS[nextStatus]}
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
