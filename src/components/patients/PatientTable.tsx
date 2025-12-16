import { Patient, TREATMENT_STATUS_LABELS, FINANCIAL_STATUS_LABELS } from '@/types/patient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Phone, Mail } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PatientTableProps {
  patients: Patient[];
  onViewPatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
}

export function PatientTable({ patients, onViewPatient, onEditPatient }: PatientTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50">
            <TableHead className="font-semibold">Paciente</TableHead>
            <TableHead className="font-semibold">Contato</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Sessões</TableHead>
            <TableHead className="font-semibold">Financeiro</TableHead>
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient, index) => (
            <TableRow 
              key={patient.id} 
              className="animate-fade-in cursor-pointer hover:bg-secondary/30"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onViewPatient(patient)}
            >
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">{patient.leadSource}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {patient.phone}
                  </span>
                  {patient.email && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {patient.email}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={patient.treatmentStatus}>
                  {TREATMENT_STATUS_LABELS[patient.treatmentStatus]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <span className="font-medium text-foreground">{patient.completedSessions}</span>
                  {patient.suggestedSessions && (
                    <span className="text-muted-foreground">/{patient.suggestedSessions}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={patient.financialStatus}>
                  {FINANCIAL_STATUS_LABELS[patient.financialStatus]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onViewPatient(patient)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onEditPatient(patient)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {patients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-medium text-foreground">Nenhum paciente encontrado</p>
          <p className="text-sm text-muted-foreground">Adicione seu primeiro paciente para começar</p>
        </div>
      )}
    </div>
  );
}
