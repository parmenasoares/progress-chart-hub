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

interface KanbanSavedBoard {
  id: string;
  name: string;
  cityFilter: string;
}

const KANBAN_COLUMNS: TreatmentStatus[] = [
  'novo',
  'em_tratamento',
  'aguardando_retorno',
  'alta_sucesso',
  'abandono',
];

export function KanbanBoard({ patients, onUpdatePatient }: KanbanBoardProps) {
  const KANBAN_SAVED_BOARDS_KEY = 'kanban-saved-boards';
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [savedBoards, setSavedBoards] = useState<KanbanSavedBoard[]>(() => {
    try {
      const stored = localStorage.getItem(KANBAN_SAVED_BOARDS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [selectedBoardId, setSelectedBoardId] = useState('default');
  const [newBoardName, setNewBoardName] = useState('');

  const getPatientCity = (patient: Patient) => {
    const context = patient.quickContext || '';
    const match = context.match(/Cidade:\s*([^|]+)/i);
    return match?.[1]?.trim() || 'Não informado';
  };

  const cities = useMemo(() => {
    const citySet = new Set(patients.map((patient) => getPatientCity(patient)));
    return Array.from(citySet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const byCity = cityFilter === 'all'
      ? patients
      : patients.filter((patient) => getPatientCity(patient) === cityFilter);

    if (!normalized) return byCity;

    return byCity.filter((patient) =>
      [patient.name, patient.phone, patient.email || '']
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [patients, search, cityFilter]);

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

  const persistBoards = (nextBoards: KanbanSavedBoard[]) => {
    setSavedBoards(nextBoards);
    localStorage.setItem(KANBAN_SAVED_BOARDS_KEY, JSON.stringify(nextBoards));
  };

  const createBoard = () => {
    if (!newBoardName.trim()) return;

    const board: KanbanSavedBoard = {
      id: `board-${Date.now()}`,
      name: newBoardName.trim(),
      cityFilter,
    };

    persistBoards([...savedBoards, board]);
    setSelectedBoardId(board.id);
    setNewBoardName('');
  };

  const selectBoard = (boardId: string) => {
    setSelectedBoardId(boardId);
    if (boardId === 'default') {
      setCityFilter('all');
      return;
    }

    const board = savedBoards.find((item) => item.id === boardId);
    if (board) {
      setCityFilter(board.cityFilter);
    }
  };

  const removeSelectedBoard = () => {
    if (selectedBoardId === 'default') return;
    const nextBoards = savedBoards.filter((item) => item.id !== selectedBoardId);
    persistBoards(nextBoards);
    setSelectedBoardId('default');
    setCityFilter('all');
  };

  return (
    <div className="flex-1">
      <Header title="Kanban" subtitle="Gerencie o funil de tratamento por etapa e cidade" />

      <div className="space-y-4 p-6">
        <div className="grid gap-3 md:grid-cols-[1fr_280px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar paciente por nome, telefone ou e-mail"
            className="max-w-xl"
          />

          <select
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Todas as cidades</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <p className="text-sm font-medium">Quadros Kanban</p>
          <div className="grid gap-2 md:grid-cols-[220px_1fr_auto_auto]">
            <select
              value={selectedBoardId}
              onChange={(event) => selectBoard(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="default">Quadro padrão (todas cidades)</option>
              {savedBoards.map((board) => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>

            <Input
              value={newBoardName}
              onChange={(event) => setNewBoardName(event.target.value)}
              placeholder="Nome do novo quadro"
            />
            <Button variant="outline" onClick={createBoard}>Criar quadro</Button>
            <Button variant="ghost" onClick={removeSelectedBoard} disabled={selectedBoardId === 'default'}>
              Remover quadro
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O quadro novo salva a cidade selecionada no filtro atual para facilitar operações recorrentes.
          </p>
        </div>

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
                              <p className="text-xs text-muted-foreground">Cidade: {getPatientCity(patient)}</p>
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
