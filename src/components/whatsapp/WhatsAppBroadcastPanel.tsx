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

interface EvolutionInstance {
  name?: string;
  instance?: {
    instanceName?: string;
  };
}

const EVOLUTION_BASE_URL_KEY = 'evolution-api-base-url';
const EVOLUTION_API_KEY_KEY = 'evolution-api-key';
const EVOLUTION_INSTANCE_KEY = 'evolution-instance';
const DEFAULT_EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

const extractPhoneDigits = (phone: string) => phone.replace(/\D/g, '');

const getInstanceName = (item: EvolutionInstance) => item.instance?.instanceName || item.name || '';

export function WhatsAppBroadcastPanel({ patients, userId }: WhatsAppBroadcastPanelProps) {
  const { toast } = useToast();
  const storageKey = (key: string) => (userId ? `${key}:${userId}` : key);

  const [baseUrl, setBaseUrl] = useState(localStorage.getItem(storageKey(EVOLUTION_BASE_URL_KEY)) || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem(storageKey(EVOLUTION_API_KEY_KEY)) || '');
  const [instance, setInstance] = useState(localStorage.getItem(storageKey(EVOLUTION_INSTANCE_KEY)) || '');
  const [newInstanceName, setNewInstanceName] = useState('');
  const [instances, setInstances] = useState<string[]>([]);
  const [isConnectingEvolution, setIsConnectingEvolution] = useState(false);

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

  const evolutionRequest = async (path: string, options?: RequestInit) => {
    const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, '');

    if (!normalizedBaseUrl || !apiKey.trim()) {
      throw new Error('Configure a URL e a API Key da Evolution API.');
    }

    return fetch(`${normalizedBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey.trim(),
        ...(options?.headers || {}),
      },
    });
  };

  const saveSettings = () => {
    localStorage.setItem(storageKey(EVOLUTION_BASE_URL_KEY), baseUrl.trim());
    localStorage.setItem(storageKey(EVOLUTION_API_KEY_KEY), apiKey.trim());
    localStorage.setItem(storageKey(EVOLUTION_INSTANCE_KEY), instance.trim());

    toast({
      title: 'Configuração salva',
      description: 'Dados da Evolution API salvos neste navegador.',
    });
  };

  const applyQuickEvolutionConfig = () => {
    if (!apiKey.trim()) {
      setApiKey(DEFAULT_EVOLUTION_API_KEY);
    }

    if (!baseUrl.trim()) {
      setBaseUrl('https://SEU_PRIMARY_DOMAIN_DA_EVOLUTION');
    }

    toast({
      title: 'Configuração rápida aplicada',
      description: 'Ajuste apenas a URL da Evolution e clique em Conectar Evolution.',
    });
  };

  const connectEvolution = async () => {
    try {
      setIsConnectingEvolution(true);

      const response = await evolutionRequest('/instance/fetchInstances');
      if (!response.ok) {
        throw new Error('Não foi possível conectar com a Evolution API.');
      }

      const payload = await response.json();
      const collection = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.instances)
          ? payload.instances
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      const availableInstances = collection
        .map((item: EvolutionInstance) => getInstanceName(item))
        .filter(Boolean);

      setInstances(availableInstances);
      if (!instance && availableInstances.length > 0) {
        setInstance(availableInstances[0]);
      }

      saveSettings();

      toast({
        title: 'Evolution conectada',
        description: `${availableInstances.length} instância(s) encontrada(s).`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Falha na conexão',
        description: 'Não foi possível validar a Evolution API com os dados informados.',
        variant: 'destructive',
      });
    } finally {
      setIsConnectingEvolution(false);
    }
  };

  const createNewInstance = async () => {
    if (!newInstanceName.trim()) {
      toast({
        title: 'Informe o nome da instância',
        description: 'Digite um nome para criar a nova instância.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsConnectingEvolution(true);

      const response = await evolutionRequest('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName: newInstanceName.trim(),
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar nova instância.');
      }

      setInstance(newInstanceName.trim());
      setNewInstanceName('');
      await connectEvolution();

      toast({
        title: 'Instância criada',
        description: 'Nova instância criada e selecionada com sucesso.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao criar instância',
        description: 'Não foi possível criar instância na Evolution API.',
        variant: 'destructive',
      });
    } finally {
      setIsConnectingEvolution(false);
    }
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
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://seu-dominio-evolution"
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
            </div>

            {instances.length > 0 && (
              <Select value={instance} onValueChange={setInstance}>
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Selecione uma instância existente" />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={saveSettings}>Salvar conexão</Button>
              <Button variant="outline" onClick={applyQuickEvolutionConfig}>Configuração rápida</Button>
              <Button onClick={connectEvolution} disabled={isConnectingEvolution}>
                {isConnectingEvolution ? 'Conectando...' : 'Conectar Evolution'}
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                value={newInstanceName}
                onChange={(event) => setNewInstanceName(event.target.value)}
                placeholder="Nova instância (ex: principal-2)"
              />
              <Button variant="secondary" onClick={createNewInstance} disabled={isConnectingEvolution}>
                Criar nova instância
              </Button>
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
