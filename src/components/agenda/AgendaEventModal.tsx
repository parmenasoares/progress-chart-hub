import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Patient, SessionEntry } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, User, FileText, DollarSign, Clock, Trash2, Save } from 'lucide-react';

interface AgendaEventModalProps {
  event: {
    patient: Patient;
    session: SessionEntry;
  };
  onClose: () => void;
  onUpdatePatient: (patient: Partial<Patient>) => void;
}

export function AgendaEventModal({ event, onClose, onUpdatePatient }: AgendaEventModalProps) {
  const { patient, session } = event;
  const [notes, setNotes] = useState(session.notes || '');
  const [evolution, setEvolution] = useState(session.evolution || '');
  const [paid, setPaid] = useState(session.paid);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    const updatedSessions = patient.sessions.map(s => 
      s.id === session.id 
        ? { ...s, notes, evolution, paid }
        : s
    );

    onUpdatePatient({
      ...patient,
      sessions: updatedSessions,
      lastEvolutionDate: evolution ? format(new Date(), 'yyyy-MM-dd') : patient.lastEvolutionDate,
    });
    
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    const updatedSessions = patient.sessions.filter(s => s.id !== session.id);
    
    onUpdatePatient({
      ...patient,
      sessions: updatedSessions,
      completedSessions: Math.max(0, patient.completedSessions - 1),
    });
    
    onClose();
  };

  const sessionDate = parseISO(session.date);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Detalhes da Consulta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Info */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{patient.name}</h3>
              <p className="text-sm text-muted-foreground">{patient.phone}</p>
              {patient.mainComplaint && (
                <p className="text-sm text-muted-foreground mt-1">
                  Queixa: {patient.mainComplaint}
                </p>
              )}
            </div>
          </div>

          {/* Session Date */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {format(sessionDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="paid-switch">Status do Pagamento</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="paid-switch"
                checked={paid}
                onCheckedChange={setPaid}
                disabled={!isEditing}
              />
              <Badge variant={paid ? 'success' : 'warning'}>
                {paid ? 'Pago' : 'Pendente'}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações da Sessão
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre a consulta..."
              rows={2}
              disabled={!isEditing}
              className="resize-none"
            />
          </div>

          {/* Evolution */}
          <div className="space-y-2">
            <Label htmlFor="evolution" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Evolução do Paciente
            </Label>
            <Textarea
              id="evolution"
              value={evolution}
              onChange={(e) => setEvolution(e.target.value)}
              placeholder="Descreva a evolução do paciente nesta sessão..."
              rows={3}
              disabled={!isEditing}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Fechar
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    Editar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
