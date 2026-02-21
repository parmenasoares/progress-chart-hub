# Operação CRM: Zoho Forms → CSV → CRM → Evolution API

## 2) Arquitetura de integração (Zoho Forms → CSV → CRM → Evolution API)

### Visão de alto nível
1. **Coleta (Zoho Forms)**
   - Leads/pacientes preenchem formulário no Zoho Forms.
   - Exportação periódica em CSV (manual ou automática via rotina externa).

2. **Ingestão (CSV → CRM)**
   - CSV é importado no CRM pela tela de Pacientes.
   - Parser robusto do CRM trata:
     - delimitador `,` / `;`
     - aspas e quebra de linha em campos longos
     - normalização de cabeçalhos variantes
   - Mapeamento para entidade `Patient` + criação de sessões quando aplicável.

3. **Enriquecimento (CRM interno)**
   - Lead vai para status inicial de Kanban.
   - Regras de deduplicação por telefone/e-mail/nome normalizado.
   - Agenda sincroniza eventos vindos de Calendly (somente GET para CRM).

4. **Orquestração de comunicação (CRM → Evolution API)**
   - Painel de Disparos WhatsApp filtra público por estágio do tratamento.
   - Mensagens usam template com variável `{{nome}}`.
   - CRM envia lote para Evolution API (`/message/sendText/{instance}`).

---

## 3) Funcionalidade de disparo em massa (WhatsApp)

### Capacidades
- Configurar credenciais por usuário:
  - Base URL da Evolution API
  - Nome da instância
  - API Key
- Seleção de público:
  - Todos os pacientes
  - Ou por coluna de tratamento (Kanban)
- Personalização:
  - Placeholder `{{nome}}`
- Execução:
  - envio sequencial por destinatário
  - contadores de enviados e erros

### Regras mínimas de segurança
- Não enviar para telefone inválido (menos de 10 dígitos).
- Exibir feedback ao final do lote (`sucesso` x `erro`).
- Salvar credenciais apenas em contexto autenticado e escopadas por `userId`.

---

## 4) Modelo de Kanban com níveis

### Níveis recomendados
1. **Novo**
2. **Em Tratamento**
3. **Aguardando Retorno**
4. **Alta (Sucesso)**
5. **Abandono**

### Objetivo operacional por nível
- **Novo:** lead recém-importado/triado.
- **Em Tratamento:** paciente ativo em sessões.
- **Aguardando Retorno:** paciente sem sessão recente, em follow-up.
- **Alta (Sucesso):** ciclo finalizado com objetivo atingido.
- **Abandono:** interrompeu tratamento.

### Métricas por coluna
- Volume de pacientes por coluna.
- Taxa de conversão `Novo → Em Tratamento`.
- Taxa de recuperação `Aguardando Retorno → Em Tratamento`.
- Taxa de abandono mensal.

---

## 5) Regras de automação

### Entrada (importação)
- Ao importar CSV:
  - criar paciente se não existir
  - atualizar paciente se já existir (chave de dedupe)
  - status padrão: `Novo` (quando não informado)

### Agenda
- Ao sincronizar Calendly:
  - se já existe paciente: anexar sessão
  - se não existe paciente: criar registro mínimo + sessão

### Comunicação
- Regras de disparo:
  - somente pacientes com telefone válido
  - bloquear envio sem credenciais da Evolution API
  - registrar contagem de falhas para reprocessamento

### Follow-up sugerido
- `Aguardando Retorno` por mais de X dias → fila de campanha de reativação.
- `Novo` sem consulta em X dias → campanha de confirmação.

---

## 6) Requisitos técnicos

### Front-end
- React + TypeScript
- Estado com hooks locais
- Persistência local de configurações por `localStorage` escopado por `userId`

### Back-end/Dados
- Supabase (pacientes/sessões)
- Leitura paginada para grandes bases (10k+)
- Processamento em lotes para consultas pesadas

### Integrações
- **Evolution API:** disparo WhatsApp
- **Calendly API:** sincronização de eventos por GET
- **Google Calendar API:** criação de eventos (quando conectado)

### Não-funcionais
- Suportar carga de 10k+ pacientes sem travar UI.
- Expor preload com status/progresso.
- Tolerância a falhas de rede em integrações externas.

---

## 7) Fluxo operacional completo

1. Captar lead no Zoho Forms.
2. Exportar CSV do Zoho.
3. Importar CSV no CRM.
4. CRM deduplica, cria/atualiza pacientes e classifica no Kanban.
5. Time operacional move pacientes entre colunas conforme evolução clínica.
6. Agenda sincroniza dados externos (Calendly/Google quando habilitado).
7. Disparo WhatsApp por segmento (Kanban) via Evolution API.
8. Registrar resultados do disparo (enviados/falhas) e atuar em reprocesso.
9. Revisão semanal de métricas de conversão, retorno e abandono.

---

## Anexo: checklist de implantação
- [ ] Chave de deduplicação definida (telefone + e-mail + nome normalizado)
- [ ] Padrão de CSV de entrada validado
- [ ] Credenciais Evolution API configuradas por usuário
- [ ] Política de mensagens e opt-out definida
- [ ] Time treinado no fluxo Kanban + Agenda + Disparos
