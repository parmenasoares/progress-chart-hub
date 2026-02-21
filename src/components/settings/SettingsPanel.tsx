import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SettingsPanelProps {
  userId?: string;
}

const CLINIC_NAME_KEY = 'clinic-name';
const CLINIC_OWNER_KEY = 'clinic-owner';
const CLINIC_TIMEZONE_KEY = 'clinic-timezone';

const EVOLUTION_BASE_URL_KEY = 'evolution-api-base-url';
const EVOLUTION_API_KEY_KEY = 'evolution-api-key';
const EVOLUTION_INSTANCE_KEY = 'evolution-instance';

const GOOGLE_CLIENT_ID_KEY = 'google-calendar-client-id';
const CALENDLY_TOKEN_KEY = 'calendly-token';

export function SettingsPanel({ userId }: SettingsPanelProps) {
  const { toast } = useToast();
  const storageKey = (key: string) => (userId ? `${key}:${userId}` : key);

  const [clinicName, setClinicName] = useState(localStorage.getItem(storageKey(CLINIC_NAME_KEY)) || '');
  const [clinicOwner, setClinicOwner] = useState(localStorage.getItem(storageKey(CLINIC_OWNER_KEY)) || '');
  const [clinicTimezone, setClinicTimezone] = useState(localStorage.getItem(storageKey(CLINIC_TIMEZONE_KEY)) || 'America/Sao_Paulo');

  const [evolutionBaseUrl, setEvolutionBaseUrl] = useState(localStorage.getItem(storageKey(EVOLUTION_BASE_URL_KEY)) || '');
  const [evolutionInstance, setEvolutionInstance] = useState(localStorage.getItem(storageKey(EVOLUTION_INSTANCE_KEY)) || '');
  const [evolutionApiKey, setEvolutionApiKey] = useState(localStorage.getItem(storageKey(EVOLUTION_API_KEY_KEY)) || '');

  const [googleClientId, setGoogleClientId] = useState(localStorage.getItem(storageKey(GOOGLE_CLIENT_ID_KEY)) || '');
  const [calendlyToken, setCalendlyToken] = useState(localStorage.getItem(storageKey(CALENDLY_TOKEN_KEY)) || '');

  const saveClinicSettings = () => {
    localStorage.setItem(storageKey(CLINIC_NAME_KEY), clinicName.trim());
    localStorage.setItem(storageKey(CLINIC_OWNER_KEY), clinicOwner.trim());
    localStorage.setItem(storageKey(CLINIC_TIMEZONE_KEY), clinicTimezone.trim());

    toast({
      title: 'Configurações salvas',
      description: 'Dados da clínica atualizados com sucesso.',
    });
  };

  const saveIntegrationSettings = () => {
    localStorage.setItem(storageKey(EVOLUTION_BASE_URL_KEY), evolutionBaseUrl.trim());
    localStorage.setItem(storageKey(EVOLUTION_INSTANCE_KEY), evolutionInstance.trim());
    localStorage.setItem(storageKey(EVOLUTION_API_KEY_KEY), evolutionApiKey.trim());
    localStorage.setItem(storageKey(GOOGLE_CLIENT_ID_KEY), googleClientId.trim());
    localStorage.setItem(storageKey(CALENDLY_TOKEN_KEY), calendlyToken.trim());

    toast({
      title: 'Integrações salvas',
      description: 'As credenciais de integração foram salvas neste navegador.',
    });
  };

  return (
    <div className="flex-1">
      <Header title="Configurações" subtitle="Gerencie os dados da clínica e integrações" />

      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da clínica</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Input
              value={clinicName}
              onChange={(event) => setClinicName(event.target.value)}
              placeholder="Nome da clínica"
            />
            <Input
              value={clinicOwner}
              onChange={(event) => setClinicOwner(event.target.value)}
              placeholder="Responsável"
            />
            <Input
              value={clinicTimezone}
              onChange={(event) => setClinicTimezone(event.target.value)}
              placeholder="Timezone"
            />

            <div className="md:col-span-3">
              <Button variant="outline" onClick={saveClinicSettings}>Salvar dados da clínica</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input
              value={evolutionBaseUrl}
              onChange={(event) => setEvolutionBaseUrl(event.target.value)}
              placeholder="Evolution API Base URL"
            />
            <Input
              value={evolutionInstance}
              onChange={(event) => setEvolutionInstance(event.target.value)}
              placeholder="Evolution Instance"
            />
            <Input
              value={evolutionApiKey}
              onChange={(event) => setEvolutionApiKey(event.target.value)}
              placeholder="Evolution API Key"
              type="password"
            />
            <Input
              value={googleClientId}
              onChange={(event) => setGoogleClientId(event.target.value)}
              placeholder="Google Client ID"
            />
            <Input
              value={calendlyToken}
              onChange={(event) => setCalendlyToken(event.target.value)}
              placeholder="Calendly token (GET)"
              type="password"
            />

            <div className="md:col-span-2">
              <Button onClick={saveIntegrationSettings}>Salvar integrações</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
