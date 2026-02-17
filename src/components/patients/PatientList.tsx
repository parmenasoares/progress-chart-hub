import { useState, useRef, ChangeEvent } from 'react';
import { Plus, Filter } from 'lucide-react';

import { Patient, TREATMENT_STATUS_LABELS, TreatmentStatus } from '@/types/patient';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { PatientTable } from './PatientTable';
import { PatientForm } from './PatientForm';
import { PatientDetail } from './PatientDetail';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PatientListProps {
  patients: Patient[];
  onAddPatient: (patient: Partial<Patient>) => Promise<void> | void;
  onUpdatePatient: (patient: Partial<Patient>) => Promise<void> | void;
}

type CsvRow = Record<string, string>;

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseCsv = (content: string): CsvRow[] => {
  const normalized = content.replace(/^\uFEFF/, '');
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {} as CsvRow);
  });
};

const escapeCsvValue = (value: unknown) => {
  const stringValue = value == null ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const stringifyCsv = (data: Patient[]) => {
  const headers = ['name', 'phone', 'email', 'leadSource', 'treatmentStatus', 'financialStatus'];
  const rows = data.map((patient) =>
    headers.map((header) => escapeCsvValue((patient as unknown as Record<string, unknown>)[header])).join(','),
  );

  return [headers.join(','), ...rows].join('\n');
};

const getCsvValue = (row: CsvRow, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return undefined;
};

const parseBoolean = (value?: string) => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return ['true', '1', 'sim', 'yes', 'y'].includes(normalized);
};

const parseNumber = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapCsvRowToPatient = (row: CsvRow): Partial<Patient> | null => {
  const name = getCsvValue(row, ['name', 'nome']);
  const phone = getCsvValue(row, ['phone', 'telefone', 'celular']);

  if (!name || !phone) return null;

  return {
    name,
    phone,
    email: getCsvValue(row, ['email', 'e-mail']),
    birthDate: getCsvValue(row, ['birthDate', 'birth_date', 'data_nascimento']),
    leadSource: getCsvValue(row, ['leadSource', 'lead_source', 'origem']) || 'Outros',
    scheduledAppointment: parseBoolean(getCsvValue(row, ['scheduledAppointment', 'scheduled_appointment', 'agendou'])) ?? false,
    nonConversionReason: getCsvValue(row, ['nonConversionReason', 'non_conversion_reason', 'motivo_nao_conversao']),
    mainComplaint: getCsvValue(row, ['mainComplaint', 'main_complaint', 'queixa_principal']),
    diagnosis: getCsvValue(row, ['diagnosis', 'diagnostico']),
    treatmentObjective: getCsvValue(row, ['treatmentObjective', 'treatment_objective', 'objetivo_tratamento']),
    suggestedSessions: parseNumber(getCsvValue(row, ['suggestedSessions', 'suggested_sessions', 'sessoes_sugeridas'])),
    completedSessions: parseNumber(getCsvValue(row, ['completedSessions', 'completed_sessions', 'sessoes_realizadas'])) ?? 0,
    treatmentStatus: (getCsvValue(row, ['treatmentStatus', 'treatment_status']) as TreatmentStatus) || 'novo',
    paymentModality: getCsvValue(row, ['paymentModality', 'payment_modality', 'modalidade_pagamento']) || 'Particular',
    sessionValue: parseNumber(getCsvValue(row, ['sessionValue', 'session_value', 'valor_sessao'])),
    financialStatus: (getCsvValue(row, ['financialStatus', 'financial_status']) as Patient['financialStatus']) || 'pendente',
    quickContext: getCsvValue(row, ['quickContext', 'quick_context', 'contexto']),
    sessionHistory: [],
    sessions: [],
  };
};

export function PatientList({ patients, onAddPatient, onUpdatePatient }: PatientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      patient.name.toLowerCase().includes(query) ||
      patient.phone.includes(searchQuery) ||
      (patient.email && patient.email.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'all' || patient.treatmentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (data: Partial<Patient>) => {
    if (selectedPatient) {
      await onUpdatePatient({ ...selectedPatient, ...data });
    } else {
      await onAddPatient(data);
    }

    setShowForm(false);
    setSelectedPatient(null);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewingPatient(null);
    setShowForm(true);
  };

  const handleExportCSV = () => {
    const csv = stringifyCsv(patients);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'patients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const rows = parseCsv(content);
      const mappedPatients = rows.map(mapCsvRowToPatient);
      const validPatients = mappedPatients.filter((patient): patient is Partial<Patient> => patient !== null);
      const invalidCount = rows.length - validPatients.length;

      for (const patient of validPatients) {
        await onAddPatient(patient);
      }

      toast({
        title: 'Importação finalizada',
        description: `${validPatients.length} paciente(s) importado(s)${invalidCount > 0 ? `, ${invalidCount} linha(s) ignorada(s)` : ''}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao importar CSV',
        description: 'Não foi possível processar o arquivo informado.',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex-1">
      <Header
        title="Pacientes"
        subtitle={`${filteredPatients.length} paciente${filteredPatients.length !== 1 ? 's' : ''}`}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-card">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(TREATMENT_STATUS_LABELS) as TreatmentStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {TREATMENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Importar CSV
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              Exportar CSV
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Novo Paciente
            </Button>
          </div>
        </div>

        <PatientTable
          patients={filteredPatients}
          onViewPatient={setViewingPatient}
          onEditPatient={handleEditPatient}
        />
      </div>

      {showForm && (
        <PatientForm
          patient={selectedPatient}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setSelectedPatient(null);
          }}
        />
      )}

      {viewingPatient && (
        <PatientDetail
          patient={viewingPatient}
          onClose={() => setViewingPatient(null)}
          onEdit={() => handleEditPatient(viewingPatient)}
          onUpdatePatient={(updatedPatient) => {
            onUpdatePatient(updatedPatient);
            setViewingPatient(updatedPatient);
          }}
        />
      )}
    </div>
  );
}
