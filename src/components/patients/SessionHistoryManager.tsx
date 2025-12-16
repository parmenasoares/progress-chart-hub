import { useState } from 'react';
import { SessionEntry } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SessionHistoryManagerProps {
  sessions: SessionEntry[];
  onChange: (sessions: SessionEntry[]) => void;
  readOnly?: boolean;
}

export function SessionHistoryManager({ sessions, onChange, readOnly = false }: SessionHistoryManagerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSession, setNewSession] = useState<Partial<SessionEntry>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    evolution: '',
    paid: true,
  });

  const generateId = () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddSession = () => {
    if (!newSession.date) return;
    
    const session: SessionEntry = {
      id: generateId(),
      date: newSession.date,
      notes: newSession.notes || '',
      evolution: newSession.evolution || '',
      paid: newSession.paid ?? true,
    };

    const updated = [...sessions, session].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    onChange(updated);
    setNewSession({
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      evolution: '',
      paid: true,
    });
    setShowAddForm(false);
  };

  const handleUpdateSession = (id: string, updates: Partial<SessionEntry>) => {
    const updated = sessions.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    onChange(updated);
  };

  const handleDeleteSession = (id: string) => {
    onChange(sessions.filter(s => s.id !== id));
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd 'de' MMMM, yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Add Session Button */}
      {!readOnly && !showAddForm && (
        <Button 
          type="button"
          variant="outline" 
          size="sm" 
          onClick={() => setShowAddForm(true)}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Sessão
        </Button>
      )}

      {/* Add Session Form */}
      {showAddForm && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">Nova Sessão</h4>
            <button 
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data da Sessão *</Label>
              <Input
                type="date"
                value={newSession.date}
                onChange={(e) => setNewSession(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={newSession.paid}
                  onCheckedChange={(checked) => setNewSession(prev => ({ ...prev, paid: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {newSession.paid ? 'Pago' : 'Pendente'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações da Sessão</Label>
            <Textarea
              value={newSession.notes}
              onChange={(e) => setNewSession(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Procedimentos realizados, técnicas aplicadas..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Evolução do Paciente</Label>
            <Textarea
              value={newSession.evolution}
              onChange={(e) => setNewSession(prev => ({ ...prev, evolution: e.target.value }))}
              placeholder="Como o paciente respondeu ao tratamento, melhoras observadas..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleAddSession} disabled={!newSession.date}>
              <Check className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {sortedSessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma sessão registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedSessions.map((session, index) => (
            <SessionItem
              key={session.id}
              session={session}
              index={sortedSessions.length - index}
              isExpanded={expandedId === session.id}
              isEditing={editingId === session.id}
              readOnly={readOnly}
              onToggleExpand={() => setExpandedId(expandedId === session.id ? null : session.id)}
              onEdit={() => setEditingId(session.id)}
              onCancelEdit={() => setEditingId(null)}
              onUpdate={(updates) => {
                handleUpdateSession(session.id, updates);
                setEditingId(null);
              }}
              onDelete={() => handleDeleteSession(session.id)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {sortedSessions.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground pt-2 border-t border-border">
          <span>Total: {sortedSessions.length} sessões</span>
          <span>
            Última: {sortedSessions[0] ? formatDate(sortedSessions[0].date) : '-'}
          </span>
        </div>
      )}
    </div>
  );
}

interface SessionItemProps {
  session: SessionEntry;
  index: number;
  isExpanded: boolean;
  isEditing: boolean;
  readOnly: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<SessionEntry>) => void;
  onDelete: () => void;
  formatDate: (date: string) => string;
}

function SessionItem({ 
  session, 
  index,
  isExpanded, 
  isEditing,
  readOnly,
  onToggleExpand, 
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  formatDate 
}: SessionItemProps) {
  const [editData, setEditData] = useState(session);

  const hasDetails = session.notes || session.evolution;

  if (isEditing) {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={editData.date}
              onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Pagamento</Label>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={editData.paid}
                onCheckedChange={(checked) => setEditData(prev => ({ ...prev, paid: checked }))}
              />
              <span className="text-sm text-muted-foreground">
                {editData.paid ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={editData.notes || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Evolução</Label>
          <Textarea
            value={editData.evolution || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, evolution: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={() => onUpdate(editData)}>
            <Check className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {index}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{formatDate(session.date)}</span>
            </div>
            {hasDetails && !isExpanded && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {session.notes || session.evolution}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            session.paid 
              ? 'bg-success/10 text-success' 
              : 'bg-warning/10 text-warning'
          }`}>
            {session.paid ? 'Pago' : 'Pendente'}
          </span>
          {hasDetails && (
            isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50 animate-scale-in">
          {session.notes && (
            <div className="pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-sm text-foreground">{session.notes}</p>
            </div>
          )}
          {session.evolution && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Evolução</p>
              <p className="text-sm text-foreground">{session.evolution}</p>
            </div>
          )}
          
          {!readOnly && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={onDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      )}

      {isExpanded && !hasDetails && !readOnly && (
        <div className="px-3 pb-3 pt-0 flex justify-end gap-2 border-t border-border/50">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            Adicionar detalhes
          </Button>
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Excluir
          </Button>
        </div>
      )}
    </div>
  );
}