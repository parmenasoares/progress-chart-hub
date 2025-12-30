import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Patient } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewAppointmentModalProps {
  patients: Patient[];
  selectedDate: Date | null;
  onClose: () => void;
  onSave: (patientId: string, date: string, notes?: string) => void;
}

export function NewAppointmentModal({ patients, selectedDate, onClose, onSave }: NewAppointmentModalProps) {
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState<Date | undefined>(selectedDate || undefined);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId || !date) return;

    onSave(patientId, format(date, 'yyyy-MM-dd'), notes || undefined);
    onClose();
  };

  const activePatients = patients.filter(
    p => p.treatmentStatus === 'em_tratamento' || p.treatmentStatus === 'novo'
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nova Consulta
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">Paciente *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger id="patient" className="w-full">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {activePatients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhum paciente ativo encontrado
                  </div>
                ) : (
                  activePatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{patient.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({patient.completedSessions} sessões)
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Data da Consulta *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações para esta consulta..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!patientId || !date}>
              <Plus className="h-4 w-4" />
              Agendar Consulta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
