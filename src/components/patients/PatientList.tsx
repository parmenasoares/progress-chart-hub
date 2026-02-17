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

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const detectDelimiter = (content: string) => {
  let inQuotes = false;
  let commaCount = 0;
  let semicolonCount = 0;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === '\n' || char === '\r') {
      break;
    }

    if (!inQuotes && char === ',') commaCount += 1;
    if (!inQuotes && char === ';') semicolonCount += 1;
  }

  return semicolonCount > commaCount ? ';' : ',';
};

const parseCsv = (content: string): CsvRow[] => {
  const normalized = content.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(normalized);
  const rows: string[][] = [];

  let currentValue = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && normalized[i + 1] === '\n') {
        i += 1;
      }

      currentRow.push(currentValue.trim());
      currentValue = '';

      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  if (currentValue !== '' || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length <= 1) return [];

  const headers = rows[0];

  return rows.slice(1).map((values) =>
    headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {} as CsvRow),
  );
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
  const normalizedKeyMap = Object.keys(row).reduce((acc, key) => {
    acc[normalizeText(key)] = key;
    return acc;
  }, {} as Record<string, string>);

  for (const key of keys) {
    const exactValue = row[key];
    if (exactValue !== undefined && exactValue !== null && String(exactValue).trim() !== '') {
      return String(exactValue).trim();
    }

    const normalizedMatch = normalizedKeyMap[normalizeText(key)];
    if (normalizedMatch) {
      const value = row[normalizedMatch];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }

    const normalizedSearch = normalizeText(key);
    const partialMatchKey = Object.keys(normalizedKeyMap).find((normalizedHeader) =>
      normalizedHeader.includes(normalizedSearch) || normalizedSearch.includes(normalizedHeader),
    );

    if (partialMatchKey) {
      const value = row[normalizedKeyMap[partialMatchKey]];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return String(value).trim();
      }
    }
  }

  return undefined;
};

const parseBoolean = (value?: string) => {
  if (!value) return undefined;
  const normalized = normalizeText(value);
  return ['true', '1', 'sim', 'yes', 'y'].includes(normalized);
};

const parseNumber = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const cleanName = (value: string) =>
  value
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ' ')
    .trim();

const cleanPhone = (value: string) => value.replace(/[^\d+]/g, '').trim();

const extractCity = (patient: Patient) => {
  const context = patient.quickContext || '';
  const match = context.match(/Cidade:\s*([^|]+)/i);
  return match?.[1]?.trim() || 'Não informado';
};

const mapCsvRowToPatient = (row: CsvRow): Partial<Patient> | null => {
  const rawName = getCsvValue(row, ['name', 'nome', 'Qual seu nome? (Paciente)', 'al seu nome? (Paciente)']);
  const rawPhone = getCsvValue(row, ['phone', 'telefone', 'celular', 'WhatsApp  (Número de Contato)', 'WhatsApp (Número de Contato)']);

  const name = rawName ? cleanName(rawName) : undefined;
  const phone = rawPhone ? cleanPhone(rawPhone) : undefined;

  if (!name || !phone) return null;

  const city = getCsvValue(row, ['cidade', 'city']);
  const sex = getCsvValue(row, ['sexo', 'sex']);
  const age = getCsvValue(row, ['Qual sua idade?', 'idade']);
  const profession = getCsvValue(row, ['Qual sua profissão?', 'profissao', 'profissão']);
  const painRegion = getCsvValue(row, ['Sinto dores de coluna na região', 'regiao']);
  const painTime = getCsvValue(row, ['Sua(s) dor(es)  existe(m) há quanto tempo?', 'tempo_dor']);
  const diagnosis = [
    getCsvValue(row, ['Já fui Diagnosticado com', 'diagnosis', 'diagnostico']),
    getCsvValue(row, ['Outras:']),
  ]
    .filter(Boolean)
    .join(' | ');

  const quickContext = [
    city ? `Cidade: ${city}` : null,
    sex ? `Sexo: ${sex}` : null,
    age ? `Idade: ${age}` : null,
    profession ? `Profissão: ${profession}` : null,
    painRegion ? `Região de dor: ${painRegion}` : null,
    painTime ? `Tempo de dor: ${painTime}` : null,
    getCsvValue(row, ['Você tem alguma informação adicional que queira informar ao Dr. Alisson?', 'quickContext']) || null,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    name,
    phone,
    email: getCsvValue(row, ['email', 'e-mail', 'Email']),
    birthDate: getCsvValue(row, ['birthDate', 'birth_date', 'data_nascimento']),
    leadSource: getCsvValue(row, ['leadSource', 'lead_source', 'origem', 'Cheguei até o Dr. Alisson pelo:']) || 'Outros',
    scheduledAppointment: parseBoolean(getCsvValue(row, ['scheduledAppointment', 'scheduled_appointment', 'agendou'])) ?? false,
    nonConversionReason: getCsvValue(row, ['nonConversionReason', 'non_conversion_reason', 'motivo_nao_conversao']),
    mainComplaint: getCsvValue(row, ['mainComplaint', 'main_complaint', 'queixa_principal', 'Oque causou ou causa suas dores?', 'Sente dores?']),
    diagnosis: diagnosis || undefined,
    treatmentObjective: getCsvValue(row, ['treatmentObjective', 'treatment_objective', 'objetivo_tratamento']),
    suggestedSessions: parseNumber(getCsvValue(row, ['suggestedSessions', 'suggested_sessions', 'sessoes_sugeridas'])),
    completedSessions: parseNumber(getCsvValue(row, ['completedSessions', 'completed_sessions', 'sessoes_realizadas'])) ?? 0,
    treatmentStatus: (getCsvValue(row, ['treatmentStatus', 'treatment_status']) as TreatmentStatus) || 'novo',
    paymentModality: getCsvValue(row, ['paymentModality', 'payment_modality', 'modalidade_pagamento']) || 'Particular',
    sessionValue: parseNumber(getCsvValue(row, ['sessionValue', 'session_value', 'valor_sessao'])),
    financialStatus: (getCsvValue(row, ['financialStatus', 'financial_status']) as Patient['financialStatus']) || 'pendente',
    quickContext: quickContext || undefined,
    sessionHistory: [],
    sessions: [],
  };
};

export function PatientList({ patients, onAddPatient, onUpdatePatient }: PatientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const cityOptions = Array.from(new Set(patients.map(extractCity))).sort((a, b) => a.localeCompare(b));

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      patient.name.toLowerCase().includes(query) ||
      patient.phone.includes(searchQuery) ||
      (patient.email && patient.email.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'all' || patient.treatmentStatus === statusFilter;
    const patientCity = extractCity(patient);
    const matchesCity = cityFilter === 'all' || patientCity === cityFilter;

    return matchesSearch && matchesStatus && matchesCity;
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
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-52 bg-card">
                <SelectValue placeholder="Filtrar por cidade" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">Todas as cidades</SelectItem>
                {cityOptions.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
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
