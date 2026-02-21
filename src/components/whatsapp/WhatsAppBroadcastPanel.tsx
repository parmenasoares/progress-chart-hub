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

interface EvolutionQrPayload {
  code?: string;
  qrcode?: string;
  base64?: string;
  pairingCode?: string;
}

interface MessageTemplate {
  id: string;
  label: string;
  body: string;
  isCustom?: boolean;
}

const EVOLUTION_BASE_URL_KEY = 'evolution-api-base-url';
const EVOLUTION_API_KEY_KEY = 'evolution-api-key';
const EVOLUTION_INSTANCE_KEY = 'evolution-instance';
const WHATSAPP_TEMPLATES_KEY = 'whatsapp-message-templates';
const WHATSAPP_SEND_DELAY_KEY = 'whatsapp-send-delay-ms';
const WHATSAPP_BATCH_SIZE_KEY = 'whatsapp-batch-size';
const WHATSAPP_BATCH_PAUSE_KEY = 'whatsapp-batch-pause-ms';

const FIXED_EVOLUTION_BASE_URL = 'https://n8n-api-evolution-api.qmkxud.easypanel.host';
const FIXED_EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

const extractPhoneDigits = (phone: string) => phone.replace(/\D/g, '');
const getInstanceName = (item: EvolutionInstance) => item.instance?.instanceName || item.name || '';

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'confirmacao-consulta',
    label: 'Confirmação de consulta',
    body: 'Olá {{nome}}, tudo bem? Estamos confirmando sua consulta. Se precisar remarcar, nos avise por aqui.',
  },
  {
    id: 'lembrete-retorno',
    label: 'Lembrete de retorno',
    body: 'Olá {{nome}}, passando para lembrar do seu retorno. Temos horários disponíveis nesta semana. Quer agendar?',
  },
  {
    id: 'reativacao',
    label: 'Reativação de paciente',
    body: 'Olá {{nome}}, sentimos sua falta! Se quiser retomar seu tratamento, responda esta mensagem e ajudamos com o agendamento.',
  },
  {
    id: 'recall-exames',
    label: 'Solicitação de exames',
    body: 'Olá {{nome}}, para avançarmos no seu acompanhamento, envie seus exames recentes por aqui quando puder.',
  },
  {
    id: 'campanha-indicacao',
    label: 'Campanha de indicação',
    body: 'Olá {{nome}}! Se conhecer alguém com dores na coluna, pode indicar nossa clínica. Será um prazer ajudar.',
  },
  {
    id: 'boas-vindas',
    label: 'Boas-vindas',
    body: 'Olá {{nome}}, seja bem-vindo(a)! Este é nosso canal oficial para agendamentos, dúvidas e suporte ao tratamento.',
  },
  {
    id: 'cobranca-pendente',
    label: 'Lembrete financeiro',
    body: 'Olá {{nome}}, passando para lembrar sobre seu pagamento pendente. Se precisar de suporte, me avise.',
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPatientCity = (patient: Patient) => {
  const context = patient.quickContext || '';
  const match = context.match(/Cidade:\s*([^|]+)/i);
  return match?.[1]?.trim() || 'Não informado';
};

const normalizePhoneForWhatsapp = (rawPhone: string) => {
  let digits = extractPhoneDigits(rawPhone);

  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    const local = digits.slice(2);
    if (local.length === 10) {
      digits = `55${local.slice(0, 2)}9${local.slice(2)}`;
    }
  }

  if (!digits.startsWith('55')) return null;

  if (digits.length < 12 || digits.length > 13) return null;

  return digits;
};

const parseResponseLog = async (response: Response) => {
  const rawBody = await response.text();
  if (!rawBody) {
    return `HTTP ${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(rawBody);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return rawBody;
  }
};

const extractQrPayload = (payload: unknown): EvolutionQrPayload | null => {
  const candidates = [
    payload,
    (payload as { data?: unknown })?.data,
    (payload as { qrcode?: unknown })?.qrcode,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;

    const typedCandidate = candidate as EvolutionQrPayload;
    if (typedCandidate.code || typedCandidate.qrcode || typedCandidate.base64 || typedCandidate.pairingCode) {
      return typedCandidate;
    }
  }

  return null;
};

const isLikelyBase64Image = (rawValue: string) => rawValue.length > 100 && /^[A-Za-z0-9+/=\n\r]+$/.test(rawValue);

const toQrImageSrc = (rawValue: string) => {
  if (!rawValue) return '';
  if (rawValue.startsWith('data:image')) return rawValue;
  if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) return rawValue;
  return `data:image/png;base64,${rawValue}`;
};

export function WhatsAppBroadcastPanel({ patients, userId }: WhatsAppBroadcastPanelProps) {
  const { toast } = useToast();
  const storageKey = (key: string) => (userId ? `${key}:${userId}` : key);

  const [baseUrl, setBaseUrl] = useState(
    localStorage.getItem(storageKey(EVOLUTION_BASE_URL_KEY)) || FIXED_EVOLUTION_BASE_URL,
  );
  const [apiKey, setApiKey] = useState(
    localStorage.getItem(storageKey(EVOLUTION_API_KEY_KEY)) || FIXED_EVOLUTION_API_KEY,
  );
  const [instance, setInstance] = useState(localStorage.getItem(storageKey(EVOLUTION_INSTANCE_KEY)) || 'principal');
  const [newInstanceName, setNewInstanceName] = useState('');
  const [instances, setInstances] = useState<string[]>([]);
  const [isConnectingEvolution, setIsConnectingEvolution] = useState(false);
  const [isFetchingQrCode, setIsFetchingQrCode] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [qrCodeInstanceName, setQrCodeInstanceName] = useState('');

  const [message, setMessage] = useState('Olá {{nome}}, passando para confirmar sua consulta 😊');
  const [selectedTemplateId, setSelectedTemplateId] = useState('custom');
  const [customTemplates, setCustomTemplates] = useState<MessageTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey(WHATSAPP_TEMPLATES_KEY));
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newTemplateLabel, setNewTemplateLabel] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('Olá {{nome}}, ');

  const [filter, setFilter] = useState<'all' | TreatmentStatus>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sendDelayMs, setSendDelayMs] = useState(() => {
    const stored = localStorage.getItem(storageKey(WHATSAPP_SEND_DELAY_KEY));
    return stored ? Number(stored) || 4000 : 4000;
  });
  const [batchSize, setBatchSize] = useState(() => {
    const stored = localStorage.getItem(storageKey(WHATSAPP_BATCH_SIZE_KEY));
    return stored ? Number(stored) || 20 : 20;
  });
  const [batchPauseMs, setBatchPauseMs] = useState(() => {
    const stored = localStorage.getItem(storageKey(WHATSAPP_BATCH_PAUSE_KEY));
    return stored ? Number(stored) || 60000 : 60000;
  });
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorLog, setLastErrorLog] = useState('');

  const availableTemplates = useMemo(
    () => [...MESSAGE_TEMPLATES, ...customTemplates.map((template) => ({ ...template, isCustom: true }))],
    [customTemplates],
  );

  const cities = useMemo(() => {
    const citySet = new Set(patients.map((patient) => getPatientCity(patient)));
    return Array.from(citySet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [patients]);

  const recipients = useMemo(() => {
    const byStatus = filter === 'all'
      ? patients
      : patients.filter((patient) => patient.treatmentStatus === filter);

    const filtered = cityFilter === 'all'
      ? byStatus
      : byStatus.filter((patient) => getPatientCity(patient) === cityFilter);

    return filtered
      .map((patient) => ({
        patient,
        phone: normalizePhoneForWhatsapp(patient.phone || ''),
      }))
      .filter((item): item is { patient: Patient; phone: string } => Boolean(item.phone));
  }, [patients, filter, cityFilter]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (templateId === 'custom') return;

    const template = availableTemplates.find((item) => item.id === templateId);
    if (template) {
      setMessage(template.body);
    }
  };

  const saveCustomTemplates = (templates: MessageTemplate[]) => {
    setCustomTemplates(templates);
    localStorage.setItem(storageKey(WHATSAPP_TEMPLATES_KEY), JSON.stringify(templates));
  };

  const addCustomTemplate = () => {
    if (!newTemplateLabel.trim() || !newTemplateBody.trim()) {
      toast({
        title: 'Modelo incompleto',
        description: 'Preencha nome e mensagem para salvar o modelo pronto.',
        variant: 'destructive',
      });
      return;
    }

    const createdTemplate: MessageTemplate = {
      id: `custom-${Date.now()}`,
      label: newTemplateLabel.trim(),
      body: newTemplateBody.trim(),
      isCustom: true,
    };

    saveCustomTemplates([...customTemplates, createdTemplate]);
    setNewTemplateLabel('');
    setNewTemplateBody('Olá {{nome}}, ');
    toast({
      title: 'Modelo criado',
      description: 'Novo modelo pronto salvo com sucesso.',
    });
  };

  const removeSelectedCustomTemplate = () => {
    const selected = availableTemplates.find((template) => template.id === selectedTemplateId);
    if (!selected?.isCustom) {
      toast({
        title: 'Selecione um modelo personalizado',
        description: 'Apenas modelos criados por você podem ser removidos.',
        variant: 'destructive',
      });
      return;
    }

    const updatedTemplates = customTemplates.filter((template) => template.id !== selectedTemplateId);
    saveCustomTemplates(updatedTemplates);
    setSelectedTemplateId('custom');
    toast({
      title: 'Modelo removido',
      description: 'Modelo personalizado excluído com sucesso.',
    });
  };

  const persistThrottleConfig = (nextDelay: number, nextBatchSize: number, nextBatchPause: number) => {
    localStorage.setItem(storageKey(WHATSAPP_SEND_DELAY_KEY), String(nextDelay));
    localStorage.setItem(storageKey(WHATSAPP_BATCH_SIZE_KEY), String(nextBatchSize));
    localStorage.setItem(storageKey(WHATSAPP_BATCH_PAUSE_KEY), String(nextBatchPause));
  };

  const evolutionRequest = async (path: string, options?: RequestInit) => {
    const normalizedBaseUrl = FIXED_EVOLUTION_BASE_URL.replace(/\/$/, '');

    return fetch(`${normalizedBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: FIXED_EVOLUTION_API_KEY,
        ...(options?.headers || {}),
      },
    });
  };

  const enforceFixedConnection = () => {
    setBaseUrl(FIXED_EVOLUTION_BASE_URL);
    setApiKey(FIXED_EVOLUTION_API_KEY);

    localStorage.setItem(storageKey(EVOLUTION_BASE_URL_KEY), FIXED_EVOLUTION_BASE_URL);
    localStorage.setItem(storageKey(EVOLUTION_API_KEY_KEY), FIXED_EVOLUTION_API_KEY);
    localStorage.setItem(storageKey(EVOLUTION_INSTANCE_KEY), instance.trim());

    toast({
      title: 'Conexão oficial aplicada',
      description: 'URL e API Key fixas da sua Evolution foram aplicadas automaticamente.',
    });
  };

  const connectEvolution = async () => {
    try {
      setIsConnectingEvolution(true);
      setLastErrorLog('');

      const response = await evolutionRequest('/instance/fetchInstances');
      if (!response.ok) {
        const errorLog = await parseResponseLog(response);
        setLastErrorLog(errorLog);
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

      localStorage.setItem(storageKey(EVOLUTION_INSTANCE_KEY), instance.trim());

      toast({
        title: 'Evolution conectada',
        description: `${availableInstances.length} instância(s) encontrada(s).`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Falha na conexão',
        description: 'Não foi possível validar a Evolution API com os dados oficiais.',
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
      setLastErrorLog('');

      const response = await evolutionRequest('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName: newInstanceName.trim(),
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      if (!response.ok) {
        const errorLog = await parseResponseLog(response);
        setLastErrorLog(errorLog);
        throw new Error('Erro ao criar nova instância.');
      }

      const payload = await response.json();
      const qrPayload = extractQrPayload(payload);
      const qrCode = qrPayload?.qrcode || qrPayload?.base64 || qrPayload?.code || '';
      if (qrCode) {
        setQrCodeValue(qrCode);
        setQrCodeInstanceName(newInstanceName.trim());
      }

      const createdInstance = newInstanceName.trim();
      setInstance(createdInstance);
      setNewInstanceName('');
      localStorage.setItem(storageKey(EVOLUTION_INSTANCE_KEY), createdInstance);
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

  const fetchQrCodeForInstance = async (targetInstance?: string) => {
    const selectedInstance = (targetInstance || instance).trim();
    if (!selectedInstance) {
      toast({
        title: 'Instância obrigatória',
        description: 'Selecione uma instância antes de gerar QR Code.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsFetchingQrCode(true);
      setLastErrorLog('');

      const response = await evolutionRequest(`/instance/connect/${encodeURIComponent(selectedInstance)}`);
      if (!response.ok) {
        const errorLog = await parseResponseLog(response);
        setLastErrorLog(errorLog);
        throw new Error('Não foi possível gerar QR Code.');
      }

      const payload = await response.json();
      const qrPayload = extractQrPayload(payload);
      const qrCode = qrPayload?.qrcode || qrPayload?.base64 || qrPayload?.code || '';

      if (!qrCode) {
        throw new Error('A Evolution não retornou QR Code para essa instância.');
      }

      setQrCodeValue(qrCode);
      setQrCodeInstanceName(selectedInstance);

      toast({
        title: 'QR Code atualizado',
        description: `Use o WhatsApp para escanear o QR da instância ${selectedInstance}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao gerar QR Code',
        description: 'Não foi possível obter o QR Code da instância selecionada.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingQrCode(false);
    }
  };

  const sendBroadcast = async () => {
    if (!instance.trim()) {
      toast({
        title: 'Instância obrigatória',
        description: 'Selecione ou informe uma instância válida antes do disparo.',
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
    setLastErrorLog('');

    const safeDelayMs = Math.max(2500, sendDelayMs);
    const safeBatchSize = Math.max(5, batchSize);
    const safeBatchPauseMs = Math.max(20000, batchPauseMs);

    persistThrottleConfig(safeDelayMs, safeBatchSize, safeBatchPauseMs);

    const endpoint = `${FIXED_EVOLUTION_BASE_URL.replace(/\/$/, '')}/message/sendText/${instance}`;
    let localSent = 0;
    let localErrors = 0;

    for (const recipient of recipients) {
      const personalizedMessage = message.replace(/{{\s*nome\s*}}/gi, recipient.patient.name);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: FIXED_EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: recipient.phone,
            text: personalizedMessage,
          }),
        });

        if (!response.ok) {
          localErrors += 1;
          const errorLog = await parseResponseLog(response);
          setLastErrorLog(`Número: ${recipient.phone}\n${errorLog}`);
        } else {
          localSent += 1;
        }
      } catch (error) {
        console.error(error);
        localErrors += 1;
        setLastErrorLog(`Número: ${recipient.phone}\n${String(error)}`);
      }

      setSentCount(localSent);
      setErrorCount(localErrors);

      const processedCount = localSent + localErrors;
      const hasMoreRecipients = processedCount < recipients.length;

      if (!hasMoreRecipients) continue;

      if (processedCount % safeBatchSize === 0) {
        await sleep(safeBatchPauseMs);
      } else {
        await sleep(safeDelayMs);
      }
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
              <Input value={baseUrl} readOnly disabled placeholder="URL Evolution" />
              <Input
                value={instance}
                onChange={(event) => setInstance(event.target.value)}
                placeholder="Nome da instância"
              />
              <Input value={apiKey} readOnly disabled placeholder="API Key Evolution" type="password" />
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
              <Button variant="outline" onClick={enforceFixedConnection}>Aplicar conexão oficial</Button>
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fetchQrCodeForInstance()}
                disabled={isFetchingQrCode || isConnectingEvolution}
              >
                {isFetchingQrCode ? 'Gerando QR Code...' : 'Gerar QR Code da instância'}
              </Button>
              {qrCodeInstanceName && (
                <Badge variant="secondary">QR ativo: {qrCodeInstanceName}</Badge>
              )}
            </div>

            {qrCodeValue && (
              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <p className="text-sm font-medium">QR Code para conectar no WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Abra o WhatsApp &gt; Dispositivos conectados &gt; Conectar dispositivo e escaneie o QR abaixo.
                </p>
                {qrCodeValue.startsWith('http') || qrCodeValue.startsWith('data:image') || isLikelyBase64Image(qrCodeValue) ? (
                  <img
                    src={toQrImageSrc(qrCodeValue)}
                    alt={`QR Code da instância ${qrCodeInstanceName || instance}`}
                    className="h-60 w-60 rounded-md border border-border object-contain"
                  />
                ) : (
                  <Textarea value={qrCodeValue} readOnly rows={4} className="font-mono text-xs" />
                )}
              </div>
            )}
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

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-full md:w-72">
                  <SelectValue placeholder="Filtrar por cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Destinatários: {recipients.length}</Badge>
                <Badge variant="secondary">Enviados: {sentCount}</Badge>
                <Badge variant="secondary">Erros: {errorCount}</Badge>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[280px_1fr] md:items-center">
              <Select value={selectedTemplateId} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Modelos prontos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Mensagem personalizada</SelectItem>
                  {availableTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Use os modelos prontos para envio rápido. Variável disponível: <code>{'{{nome}}'}</code>.
                </p>
                <Button variant="ghost" size="sm" onClick={removeSelectedCustomTemplate} className="h-7 px-0 text-xs">
                  Remover modelo personalizado selecionado
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <p className="text-sm font-medium">Criar novo modelo pronto</p>
              <div className="grid gap-2 md:grid-cols-[240px_1fr_auto]">
                <Input
                  value={newTemplateLabel}
                  onChange={(event) => setNewTemplateLabel(event.target.value)}
                  placeholder="Nome do modelo"
                />
                <Input
                  value={newTemplateBody}
                  onChange={(event) => setNewTemplateBody(event.target.value)}
                  placeholder="Mensagem modelo"
                />
                <Button variant="outline" onClick={addCustomTemplate}>Salvar modelo</Button>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <p className="text-sm font-medium">Proteção anti-bloqueio do número</p>
              <p className="text-xs text-muted-foreground">
                O disparo respeita intervalos automáticos para reduzir risco de bloqueio no WhatsApp.
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  type="number"
                  min={2500}
                  value={sendDelayMs}
                  onChange={(event) => setSendDelayMs(Number(event.target.value || 0))}
                  placeholder="Delay entre envios (ms)"
                />
                <Input
                  type="number"
                  min={5}
                  value={batchSize}
                  onChange={(event) => setBatchSize(Number(event.target.value || 0))}
                  placeholder="Qtd por lote"
                />
                <Input
                  type="number"
                  min={20000}
                  value={batchPauseMs}
                  onChange={(event) => setBatchPauseMs(Number(event.target.value || 0))}
                  placeholder="Pausa entre lotes (ms)"
                />
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

            {lastErrorLog && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-destructive">Último log de erro</p>
                <Textarea value={lastErrorLog} readOnly rows={6} className="font-mono text-xs" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
