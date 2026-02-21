import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Patient, TreatmentStatus, TREATMENT_STATUS_LABELS } from '@/types/patient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface WhatsAppBroadcastPanelProps {
  patients: Patient[];
  userId?: string;
}

const EVOLUTION_BASE_URL_KEY = 'evolution-api-base-url';
const EVOLUTION_API_KEY_KEY = 'evolution-api-key';
const EVOLUTION_INSTANCE_KEY = 'evolution-instance';

const extractPhoneDigits = (phone: string) => phone.replace(/\D/g, '');

export function WhatsAppBroadcastPanel({ patients, userId }: WhatsAppBroadcastPanelProps) {
  const { toast } = useToast();
  const storageKey = (key: string) => (userId ? `${key}:${userId}` : key);

  const [baseUrl, setBaseUrl] = useState(localStorage.getItem(storageKey(EVOLUTION_BASE_URL_KEY)) || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem(storageKey(EVOLUTION_API_KEY_KEY)) || '');
  const [instance, setInstance] = useState(localStorage.getItem(storageKey(EVOLUTION_INSTANCE_KEY)) || '');
  const [message, setMessage] = useState('Olá {{nome}}, passando para confirmar sua consulta 😊');
  const [filter, setFilter] = useState<'all' | TreatmentStatus>('all');
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const recipients = useMemo(() => {
    const filtered = filter === 'all'
      ? patients
      : patients.filter((patient) => patient.treatmentStatus === filter);

    return filtered
      .map((patient) => ({
        patient,
        phone: extractPhoneDigits(patient.phone || ''),
      }))
      .filter((item) => item.phone.length >= 10);
  }, [patients, filter]);

  const saveSettings = () => {
    localStorage.setItem(storageKey(EVOLUTION_BASE_URL_KEY), baseUrl.trim());
    localStorage.setItem(storageKey(EVOLUTION_API_KEY_KEY), apiKey.trim());
    localStorage.setItem(storageKey(EVOLUTION_INSTANCE_KEY), instance.trim());

    toast({
      title: 'Configuração salva',
      description: 'Dados da Evolution API salvos neste navegador.',
    });
  };

  const sendBroadcast = async () => {
    if (!baseUrl || !apiKey || !instance) {
      toast({
        title: 'Configure a Evolution API',
        description: 'Informe URL base, API Key e Instance antes do disparo.',
        variant: 'destructive',
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Mensagem obrigatória',
        description: 'Digite a mensagem para iniciar o disparo.',
        variant: 'destructive',
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: 'Sem destinatários válidos',
        description: 'Não há pacientes com telefone válido para disparo.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setSentCount(0);
    setErrorCount(0);

    const endpoint = `${baseUrl.replace(/\/$/, '')}/message/sendText/${instance}`;
    let localSent = 0;
    let localErrors = 0;

    for (const recipient of recipients) {
      const personalizedMessage = message.replace(/{{\s*nome\s*}}/gi, recipient.patient.name);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: recipient.phone,
            text: personalizedMessage,
          }),
        });

        if (!response.ok) {
          localErrors += 1;
        } else {
          localSent += 1;
        }
      } catch (error) {
        console.error(error);
        localErrors += 1;
      }

      setSentCount(localSent);
      setErrorCount(localErrors);
    }

    setIsSending(false);

    toast({
      title: 'Disparo finalizado',
      description: `${localSent} enviado(s), ${localErrors} erro(s).`,
      variant: localErrors > 0 ? 'destructive' : 'default',
    });
  };

  return (
    <div className="flex-1">
      <Header title="Disparos WhatsApp" subtitle="Envie mensagens em lote via Evolution API" />

      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Conexão Evolution API</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://sua-evolution-api.com"
            />
            <Input
              value={instance}
              onChange={(event) => setInstance(event.target.value)}
              placeholder="Nome da instância"
            />
            <Input
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="API Key"
              type="password"
            />
            <div className="md:col-span-3">
              <Button variant="outline" onClick={saveSettings}>Salvar conexão</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disparo em lote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | TreatmentStatus)}>
                <SelectTrigger className="w-full md:w-72">
                  <SelectValue placeholder="Filtrar por etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.keys(TREATMENT_STATUS_LABELS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {TREATMENT_STATUS_LABELS[status as TreatmentStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Destinatários: {recipients.length}</Badge>
                <Badge variant="secondary">Enviados: {sentCount}</Badge>
                <Badge variant="secondary">Erros: {errorCount}</Badge>
              </div>
            </div>

            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              placeholder="Digite sua mensagem... Use {{nome}} para personalizar."
            />

            <div className="flex items-center gap-2">
              <Button onClick={sendBroadcast} disabled={isSending}>
                {isSending ? 'Enviando...' : 'Iniciar disparo'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Endpoint utilizado: <code>/message/sendText/{'{instance}'}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
