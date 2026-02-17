import { useState, useMemo, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, parseISO, isToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Patient, SessionEntry } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Plus, User, Link as LinkIcon, Unplug, Bell, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgendaEventModal } from './AgendaEventModal';
import { NewAppointmentModal } from './NewAppointmentModal';
import { useToast } from '@/hooks/use-toast';

interface AgendaProps {
  patients: Patient[];
  onUpdatePatient: (patient: Partial<Patient>) => void;
  userId?: string;
}

type ViewMode = 'week' | 'month';

interface AppointmentEvent {
  patient: Patient;
  session: SessionEntry;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
}

const GOOGLE_CLIENT_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_TOKEN_KEY = 'google-calendar-access-token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'google-calendar-access-token-expiry';
const GOOGLE_CALENDAR_EMAIL_KEY = 'google-calendar-email';
const GOOGLE_CLIENT_ID_KEY = 'google-calendar-client-id';
const GOOGLE_NOTIFICATION_DAY_KEY = 'google-agenda-notification-day';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';
const ALLOWED_GOOGLE_EMAIL = 'samuraidebh@gmail.com';
const CALENDLY_TOKEN_KEY = 'calendly-token';
const CALENDLY_USER_URI_KEY = 'calendly-user-uri';

const buildGoogleCalendarEventBody = ({
  patientName,
  date,
  notes,
}: {
  patientName: string;
  date: string;
  notes?: string;
}) => {
  const start = parseISO(date);
  const end = addDays(start, 1);

  return {
    summary: `Consulta - ${patientName}`,
    description: notes || `Consulta com ${patientName}`,
    start: { date: format(start, 'yyyy-MM-dd') },
    end: { date: format(end, 'yyyy-MM-dd') },
  };
};

const loadGoogleIdentityScript = async () => {
  if (window.google?.accounts?.oauth2) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_CLIENT_SCRIPT_SRC}"]`);

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Não foi possível carregar o script do Google.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_CLIENT_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar o script do Google.'));
    document.head.appendChild(script);
  });
};

export function Agenda({ patients, onUpdatePatient, userId }: AgendaProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [calendlyToken, setCalendlyToken] = useState('');
  const [calendlyUserUri, setCalendlyUserUri] = useState('');
  const [isSyncingCalendly, setIsSyncingCalendly] = useState(false);
  const { toast } = useToast();

  const storageKey = (key: string) => (userId ? `${key}:${userId}` : key);

  const handleGoogleDisconnect = (showToast = true) => {
    setGoogleAccessToken(null);
    setGoogleEmail('');
    localStorage.removeItem(storageKey(GOOGLE_TOKEN_KEY));
    localStorage.removeItem(storageKey(GOOGLE_TOKEN_EXPIRY_KEY));
    localStorage.removeItem(storageKey(GOOGLE_CALENDAR_EMAIL_KEY));

    if (showToast) {
      toast({
        title: 'Google Agenda desconectada',
        description: 'A integração com Google foi removida deste navegador.',
      });
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem(storageKey(GOOGLE_TOKEN_KEY));
    const savedExpiry = localStorage.getItem(storageKey(GOOGLE_TOKEN_EXPIRY_KEY));
    const savedEmail = localStorage.getItem(storageKey(GOOGLE_CALENDAR_EMAIL_KEY));
    const savedClientId = localStorage.getItem(storageKey(GOOGLE_CLIENT_ID_KEY));
    const savedCalendlyToken = localStorage.getItem(storageKey(CALENDLY_TOKEN_KEY));
    const savedCalendlyUserUri = localStorage.getItem(storageKey(CALENDLY_USER_URI_KEY));

    if (savedEmail) {
      if (savedEmail.toLowerCase() === ALLOWED_GOOGLE_EMAIL) {
        setGoogleEmail(savedEmail);
      } else {
        handleGoogleDisconnect(false);
      }
    }

    if (savedToken && savedExpiry && Number(savedExpiry) > Date.now() && savedEmail?.toLowerCase() === ALLOWED_GOOGLE_EMAIL) {
      setGoogleAccessToken(savedToken);
    }

    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID && savedClientId) {
      setGoogleClientId(savedClientId);
    }

    if (savedCalendlyToken) {
      setCalendlyToken(savedCalendlyToken);
    }

    if (savedCalendlyUserUri) {
      setCalendlyUserUri(savedCalendlyUserUri);
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleGoogleClientIdChange = (value: string) => {
    setGoogleClientId(value);
    localStorage.setItem(storageKey(GOOGLE_CLIENT_ID_KEY), value);
  };



  const handleCalendlyTokenChange = (value: string) => {
    setCalendlyToken(value);
    localStorage.setItem(storageKey(CALENDLY_TOKEN_KEY), value);
  };

  const resolveCalendlyUserUri = async (token: string) => {
    if (calendlyUserUri) {
      return calendlyUserUri;
    }

    const response = await fetch('https://api.calendly.com/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Não foi possível identificar o usuário do Calendly.');
    }

    const data = await response.json();
    const uri = data?.resource?.uri as string | undefined;
    if (!uri) {
      throw new Error('Usuário do Calendly inválido.');
    }

    setCalendlyUserUri(uri);
    localStorage.setItem(storageKey(CALENDLY_USER_URI_KEY), uri);
    return uri;
  };

  const syncCalendlyEventsToCrm = async () => {
    if (!calendlyToken) {
      toast({
        title: 'Conecte o Calendly',
        description: 'Informe apenas o token do Calendly para puxar os dados.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSyncingCalendly(true);
      const userUri = await resolveCalendlyUserUri(calendlyToken);

      const minStartTime = new Date();
      minStartTime.setDate(minStartTime.getDate() - 30);

      const params = new URLSearchParams({
        user: userUri,
        min_start_time: minStartTime.toISOString(),
        count: '100',
      });

      const scheduledEventsResponse = await fetch(`https://api.calendly.com/scheduled_events?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${calendlyToken}`,
        },
      });

      if (!scheduledEventsResponse.ok) {
        throw new Error('Erro ao buscar eventos do Calendly.');
      }

      const scheduledEventsData = await scheduledEventsResponse.json();
      const collection = (scheduledEventsData.collection || []) as Array<{ name: string; start_time: string; uri: string }>;

      let syncedCount = 0;

      for (const event of collection) {
        const inviteesResponse = await fetch(`${event.uri}/invitees`, {
          headers: {
            Authorization: `Bearer ${calendlyToken}`,
          },
        });

        if (!inviteesResponse.ok) continue;

        const inviteesData = await inviteesResponse.json();
        const invitees = (inviteesData.collection || []) as Array<{ email?: string; name?: string }>;

        for (const invitee of invitees) {
          const matchedPatient = patients.find((patient) => {
            if (invitee.email && patient.email) {
              return patient.email.toLowerCase() === invitee.email.toLowerCase();
            }
            if (invitee.name) {
              return patient.name.toLowerCase() === invitee.name.toLowerCase();
            }
            return false;
          });

          if (!matchedPatient) continue;

          const sessionDate = format(parseISO(event.start_time), 'yyyy-MM-dd');
          const sessionNote = `[Calendly] ${event.name}`;
          const exists = matchedPatient.sessions.some(
            (session) => session.date === sessionDate && (session.notes || '').includes(sessionNote),
          );

          if (exists) continue;

          const newSession: SessionEntry = {
            id: crypto.randomUUID(),
            date: sessionDate,
            notes: sessionNote,
            paid: false,
          };

          onUpdatePatient({
            ...matchedPatient,
            sessions: [...matchedPatient.sessions, newSession],
            completedSessions: matchedPatient.completedSessions + 1,
          });

          syncedCount += 1;
        }
      }

      toast({
        title: 'Calendly sincronizado',
        description: `${syncedCount} consulta(s) puxada(s) do Calendly para o CRM.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao sincronizar Calendly',
        description: 'Falha ao puxar informações do Calendly para o CRM.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncingCalendly(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notificação indisponível',
        description: 'Este navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    toast({
      title: permission === 'granted' ? 'Notificações ativadas' : 'Notificações não ativadas',
      description: permission === 'granted'
        ? 'Você receberá lembretes da agenda neste navegador.'
        : 'Permita notificações no navegador para receber alertas.',
      variant: permission === 'granted' ? 'default' : 'destructive',
    });
  };

  const connectGoogleCalendar = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || googleClientId;

    if (!clientId) {
      toast({
        title: 'Configuração pendente',
        description: 'Informe o Google Client ID para conectar sua conta.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsConnectingGoogle(true);
      await loadGoogleIdentityScript();

      const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
        const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
          client_id: clientId,
          scope: GOOGLE_SCOPES,
          callback: (response) => {
            if (!response.access_token) {
              reject(new Error('Token de acesso inválido.'));
              return;
            }
            resolve({
              access_token: response.access_token,
              expires_in: response.expires_in || 3600,
            });
          },
          error_callback: () => reject(new Error('Falha na autenticação com Google.')),
        });

        if (!tokenClient) {
          reject(new Error('Não foi possível inicializar a autenticação Google.'));
          return;
        }

        tokenClient.requestAccessToken({ prompt: 'consent' });
      });

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Não foi possível validar a conta Google conectada.');
      }

      const userInfo = await userInfoResponse.json();
      const connectedEmail = String(userInfo.email || '').toLowerCase();

      if (connectedEmail !== ALLOWED_GOOGLE_EMAIL) {
        toast({
          title: 'Conta não permitida',
          description: `Conecte apenas a conta ${ALLOWED_GOOGLE_EMAIL}.`,
          variant: 'destructive',
        });
        handleGoogleDisconnect(false);
        return;
      }

      const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
      localStorage.setItem(storageKey(GOOGLE_TOKEN_KEY), tokenResponse.access_token);
      localStorage.setItem(storageKey(GOOGLE_TOKEN_EXPIRY_KEY), String(expiresAt));
      localStorage.setItem(storageKey(GOOGLE_CALENDAR_EMAIL_KEY), connectedEmail);
      setGoogleAccessToken(tokenResponse.access_token);
      setGoogleEmail(connectedEmail);

      toast({
        title: 'Google Agenda conectada',
        description: `Conta autorizada: ${connectedEmail}`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao conectar Google',
        description: 'Não foi possível conectar sua conta Google Agenda.',
        variant: 'destructive',
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const createGoogleCalendarEvent = async (patient: Patient, date: string, notes?: string) => {
    if (!googleAccessToken) {
      toast({
        title: 'Conecte sua conta Google',
        description: `Conecte ${ALLOWED_GOOGLE_EMAIL} para sincronizar eventos.`,
      });
      return;
    }

    if (googleEmail.toLowerCase() !== ALLOWED_GOOGLE_EMAIL) {
      toast({
        title: 'Conta inválida',
        description: `Somente ${ALLOWED_GOOGLE_EMAIL} pode receber eventos.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildGoogleCalendarEventBody({
          patientName: patient.name,
          date,
          notes,
        })),
      });

      if (response.status === 401) {
        handleGoogleDisconnect(false);
        toast({
          title: 'Sessão Google expirada',
          description: 'Conecte novamente sua conta para continuar sincronizando.',
          variant: 'destructive',
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Erro ao criar evento no Google Calendar.');
      }

      toast({
        title: 'Evento sincronizado',
        description: `Consulta de ${patient.name} enviada para Google Agenda.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Falha na sincronização',
        description: 'Não foi possível criar o evento no Google Agenda.',
        variant: 'destructive',
      });
    }
  };

  const events = useMemo(() => {
    const allEvents: AppointmentEvent[] = [];
    patients.forEach(patient => {
      patient.sessions.forEach(session => {
        allEvents.push({ patient, session });
      });
    });
    return allEvents;
  }, [patients]);

  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    const alreadyNotified = localStorage.getItem(storageKey(GOOGLE_NOTIFICATION_DAY_KEY)) === todayKey;
    if (alreadyNotified) return;

    const todayEvents = events.filter(({ session }) => isSameDay(parseISO(session.date), today));
    if (todayEvents.length === 0) return;

    const patientsLabel = todayEvents.map((event) => event.patient.name).slice(0, 3).join(', ');

    new Notification('Agenda de hoje', {
      body: `${todayEvents.length} consulta(s) hoje${patientsLabel ? `: ${patientsLabel}` : ''}`,
    });

    localStorage.setItem(storageKey(GOOGLE_NOTIFICATION_DAY_KEY), todayKey);
  }, [events, notificationPermission]);

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

    void createGoogleCalendarEvent(patient, date, notes);

    if (notificationPermission === 'granted') {
      new Notification('Consulta agendada', {
        body: `${patient.name} em ${format(parseISO(date), 'dd/MM/yyyy')}`,
      });
    }
  };

  const headerTitle = viewMode === 'week'
    ? `${format(dateRange.start, "d 'de' MMMM", { locale: ptBR })} - ${format(dateRange.end, "d 'de' MMMM", { locale: ptBR })}`
    : format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="flex-1">
      <Header title="Agenda" subtitle="Gerencie suas consultas" />

      <div className="p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="font-display text-base font-semibold text-foreground capitalize sm:ml-4 sm:text-lg">
              {headerTitle}
            </span>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <Input
                value={googleClientId}
                onChange={(e) => handleGoogleClientIdChange(e.target.value)}
                placeholder="Google Client ID (OAuth Web)"
                className="w-full bg-card sm:w-72"
              />
            )}

            <Input
              value={calendlyToken}
              onChange={(e) => handleCalendlyTokenChange(e.target.value)}
              placeholder="Calendly token (somente leitura GET)"
              className="w-full bg-card sm:w-72"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={syncCalendlyEventsToCrm}
              disabled={isSyncingCalendly}
              className="w-full sm:w-auto"
            >
              <RefreshCcw className="h-4 w-4" />
              {isSyncingCalendly ? 'Sincronizando Calendly...' : 'Conectar e puxar Calendly → CRM'}
            </Button>

            <Button variant="outline" size="sm" onClick={requestNotificationPermission} className="w-full sm:w-auto">
              <Bell className="h-4 w-4" />
              {notificationPermission === 'granted' ? 'Notificações ativas' : 'Ativar notificações'}
            </Button>

            {googleAccessToken ? (
              <>
                <Badge variant="success">Google conectado: {googleEmail || ALLOWED_GOOGLE_EMAIL}</Badge>
                <Button variant="outline" size="sm" onClick={() => handleGoogleDisconnect()}>
                  <Unplug className="h-4 w-4" />
                  Desconectar
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={connectGoogleCalendar} disabled={isConnectingGoogle} className="w-full sm:w-auto">
                <LinkIcon className="h-4 w-4" />
                {isConnectingGoogle ? 'Conectando...' : `Conectar ${ALLOWED_GOOGLE_EMAIL}`}
              </Button>
            )}

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
            <Button onClick={() => setShowNewAppointment(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Nova Consulta
            </Button>
          </div>
        </div>

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

      {selectedEvent && (
        <AgendaEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdatePatient={onUpdatePatient}
          onAddToGoogleCalendar={createGoogleCalendarEvent}
        />
      )}

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

interface WeekViewProps {
  days: Date[];
  getEventsForDay: (day: Date) => AppointmentEvent[];
  onEventClick: (event: AppointmentEvent) => void;
  onDayClick: (day: Date) => void;
}

function WeekView({ days, getEventsForDay, onEventClick, onDayClick }: WeekViewProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[840px] grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <Card
              key={day.toISOString()}
              className={cn(
                'min-h-[200px] cursor-pointer transition-colors hover:border-primary/50',
                isCurrentDay && 'border-primary bg-primary/5'
              )}
              onClick={() => onDayClick(day)}
            >
              <CardHeader className="p-3 pb-2">
                <CardTitle className={cn(
                  'text-sm font-medium',
                  isCurrentDay && 'text-primary'
                )}>
                  <span className="capitalize">{format(day, 'EEEE', { locale: ptBR })}</span>
                  <span className={cn(
                    'ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full',
                    isCurrentDay && 'bg-primary text-primary-foreground'
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
                        'p-2 rounded-md cursor-pointer transition-colors text-xs',
                        event.session.paid
                          ? 'bg-success/10 border border-success/30 hover:bg-success/20'
                          : 'bg-warning/10 border border-warning/30 hover:bg-warning/20'
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
    </div>
  );
}

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  getEventsForDay: (day: Date) => AppointmentEvent[];
  onEventClick: (event: AppointmentEvent) => void;
  onDayClick: (day: Date) => void;
}

function MonthView({ days, currentDate, getEventsForDay, onEventClick, onDayClick }: MonthViewProps) {
  const startDay = startOfMonth(currentDate);
  const startDayOfWeek = startDay.getDay();
  const paddedDays = Array(startDayOfWeek).fill(null).concat(days);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-2 overflow-x-auto pb-2">
      <div className="grid min-w-[840px] grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      <div className="grid min-w-[840px] grid-cols-7 gap-1">
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
                'min-h-[100px] cursor-pointer transition-colors hover:border-primary/50',
                isCurrentDay && 'border-primary',
                !isCurrentMonth && 'opacity-40'
              )}
            >
              <CardContent className="p-2" onClick={(e) => e.stopPropagation()}>
                <div className={cn(
                  'text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                  isCurrentDay && 'bg-primary text-primary-foreground'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.session.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        'p-1 rounded text-xs truncate cursor-pointer',
                        event.session.paid
                          ? 'bg-success/20 text-success-foreground'
                          : 'bg-warning/20 text-warning-foreground'
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
