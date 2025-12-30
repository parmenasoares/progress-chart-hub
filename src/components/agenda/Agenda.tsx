import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Patient, SessionEntry } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Plus, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgendaEventModal } from './AgendaEventModal';
import { NewAppointmentModal } from './NewAppointmentModal';

interface AgendaProps {
  patients: Patient[];
  onUpdatePatient: (patient: Partial<Patient>) => void;
}

type ViewMode = 'week' | 'month';

interface AppointmentEvent {
  patient: Patient;
  session: SessionEntry;
}

export function Agenda({ patients, onUpdatePatient }: AgendaProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Flatten all sessions from all patients into events
  const events = useMemo(() => {
    const allEvents: AppointmentEvent[] = [];
    patients.forEach(patient => {
      patient.sessions.forEach(session => {
        allEvents.push({ patient, session });
      });
    });
    return allEvents;
  }, [patients]);

  // Get date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { locale: ptBR }),
        end: endOfWeek(currentDate, { locale: ptBR }),
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
  }, [currentDate, viewMode]);

  const days = useMemo(() => 
    eachDayOfInterval({ start: dateRange.start, end: dateRange.end }),
    [dateRange]
  );

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const sessionDate = parseISO(event.session.date);
      return isSameDay(sessionDate, day);
    });
  };

  const navigatePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setShowNewAppointment(true);
  };

  const handleNewAppointment = (patientId: string, date: string, notes?: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const newSession: SessionEntry = {
      id: crypto.randomUUID(),
      date,
      notes,
      paid: false,
    };

    onUpdatePatient({
      ...patient,
      sessions: [...patient.sessions, newSession],
      completedSessions: patient.completedSessions + 1,
    });
  };

  const headerTitle = viewMode === 'week'
    ? `${format(dateRange.start, "d 'de' MMMM", { locale: ptBR })} - ${format(dateRange.end, "d 'de' MMMM", { locale: ptBR })}`
    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex-1">
      <Header title="Agenda" subtitle="Gerencie suas consultas" />

      <div className="p-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-4 font-display text-lg font-semibold text-foreground capitalize">
              {headerTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-card p-1">
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                <List className="h-4 w-4 mr-1" />
                Semana
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Mês
              </Button>
            </div>
            <Button onClick={() => setShowNewAppointment(true)}>
              <Plus className="h-4 w-4" />
              Nova Consulta
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'week' ? (
          <WeekView 
            days={days} 
            getEventsForDay={getEventsForDay} 
            onEventClick={setSelectedEvent}
            onDayClick={handleDayClick}
          />
        ) : (
          <MonthView 
            days={days} 
            currentDate={currentDate}
            getEventsForDay={getEventsForDay} 
            onEventClick={setSelectedEvent}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <AgendaEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdatePatient={onUpdatePatient}
        />
      )}

      {/* New Appointment Modal */}
      {showNewAppointment && (
        <NewAppointmentModal
          patients={patients}
          selectedDate={selectedDate}
          onClose={() => {
            setShowNewAppointment(false);
            setSelectedDate(null);
          }}
          onSave={handleNewAppointment}
        />
      )}
    </div>
  );
}

// Week View Component
interface WeekViewProps {
  days: Date[];
  getEventsForDay: (day: Date) => AppointmentEvent[];
  onEventClick: (event: AppointmentEvent) => void;
  onDayClick: (day: Date) => void;
}

function WeekView({ days, getEventsForDay, onEventClick, onDayClick }: WeekViewProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayEvents = getEventsForDay(day);
        const isCurrentDay = isToday(day);

        return (
          <Card 
            key={day.toISOString()} 
            className={cn(
              "min-h-[200px] cursor-pointer transition-colors hover:border-primary/50",
              isCurrentDay && "border-primary bg-primary/5"
            )}
            onClick={() => onDayClick(day)}
          >
            <CardHeader className="p-3 pb-2">
              <CardTitle className={cn(
                "text-sm font-medium",
                isCurrentDay && "text-primary"
              )}>
                <span className="capitalize">{format(day, 'EEEE', { locale: ptBR })}</span>
                <span className={cn(
                  "ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full",
                  isCurrentDay && "bg-primary text-primary-foreground"
                )}>
                  {format(day, 'd')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2" onClick={(e) => e.stopPropagation()}>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma consulta</p>
              ) : (
                dayEvents.map((event) => (
                  <div
                    key={event.session.id}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "p-2 rounded-md cursor-pointer transition-colors text-xs",
                      event.session.paid 
                        ? "bg-success/10 border border-success/30 hover:bg-success/20"
                        : "bg-warning/10 border border-warning/30 hover:bg-warning/20"
                    )}
                  >
                    <div className="flex items-center gap-1 font-medium">
                      <User className="h-3 w-3" />
                      {event.patient.name}
                    </div>
                    {event.session.notes && (
                      <p className="text-muted-foreground truncate mt-1">
                        {event.session.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Month View Component
interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  getEventsForDay: (day: Date) => AppointmentEvent[];
  onEventClick: (event: AppointmentEvent) => void;
  onDayClick: (day: Date) => void;
}

function MonthView({ days, currentDate, getEventsForDay, onEventClick, onDayClick }: MonthViewProps) {
  // Pad the start of the month to align with the correct weekday
  const startDay = startOfMonth(currentDate);
  const startDayOfWeek = startDay.getDay(); // 0 = Sunday
  const paddedDays = Array(startDayOfWeek).fill(null).concat(days);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-2">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddedDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="min-h-[100px]" />;
          }

          const dayEvents = getEventsForDay(day);
          const isCurrentDay = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <Card
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[100px] cursor-pointer transition-colors hover:border-primary/50",
                isCurrentDay && "border-primary",
                !isCurrentMonth && "opacity-40"
              )}
            >
              <CardContent className="p-2" onClick={(e) => e.stopPropagation()}>
                <div className={cn(
                  "text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  isCurrentDay && "bg-primary text-primary-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.session.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "p-1 rounded text-xs truncate cursor-pointer",
                        event.session.paid
                          ? "bg-success/20 text-success-foreground"
                          : "bg-warning/20 text-warning-foreground"
                      )}
                    >
                      {event.patient.name}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayEvents.length - 2} mais
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
