import { useState, useRef, ChangeEvent } from 'react';
import { Patient } from '@/types/patient';
import { PatientTable } from './PatientTable';
import { PatientForm } from './PatientForm';
import { PatientDetail } from './PatientDetail';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';

import Papa from 'papaparse';
import { Plus, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TREATMENT_STATUS_LABELS, TreatmentStatus } from '@/types/patient';

interface PatientListProps {
  patients: Patient[];
  onAddPatient: (patient: Partial<Patient>) => void;
  onUpdatePatient: (patient: Partial<Patient>) => void;
}

export function PatientList({ patients, onAddPatient, onUpdatePatient }: PatientListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPatients = patients.filter(patient => {
      

    
      patient.phone.includes(searchQuery) ||
      (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || patient.treatmentStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (data: Partial<Patient>) => {
    if (selectedPatient) {
      onUpdatePatient({ ...selectedPatient, ...data });
    } else {
      onAddPatient(data);
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
    const csv = Papa.unparse(patients);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'patients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.pars>(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const importedPatients = results.data as Patient[];
        importedPatients.forEach(p => {
          onAddPatient(p);
        });
      },
      error: err => {
        console.error(err);
      },
    });
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
        {/* Actions Bar */}
     
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
             <input
        type="file"
        accept=".csv"
     ref=   {fileInputRef}}
        onChange={handleImportCSV}
        style={{ display: 'none' }}
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

        {/* Table */}
        <PatientTable 
          patients={filteredPatients}
          onViewPatient={setViewingPatient}
          onEditPatient={handleEditPatient}
        />
      </div>

      {/* Modals */}
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
