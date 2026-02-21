# Tutorial Inicial da Plataforma CRM

## 1) Visão geral
Este CRM foi feito para gerir pacientes, agenda, Kanban de etapas de tratamento, integrações (Google/Calendly), e disparos de WhatsApp via Evolution API.

Fluxo recomendado de uso:
1. Configurar integrações.
2. Importar/cadastrar pacientes.
3. Organizar operação no Kanban.
4. Sincronizar agenda.
5. Executar campanhas de WhatsApp segmentadas.

---

## 2) Primeiro acesso (setup rápido)
1. Abra **Configurações**.
2. Preencha dados da clínica.
3. Em integrações, confirme credenciais necessárias (Google/Calendly/Evolution).
4. No módulo de WhatsApp, clique em **Conectar Evolution** para listar instâncias.
5. Se necessário, use **Criar nova instância**.

---

## 3) Cadastro de clientes (manual e CSV)

### 3.1 Cadastro manual
1. Vá em **Pacientes**.
2. Clique em **Novo Paciente**.
3. Preencha ao menos:
   - Nome
   - Telefone
   - **Cidade**
4. Salve o cadastro.

### 3.2 Importação CSV
1. Em **Pacientes**, use **Importar CSV**.
2. O sistema tenta reconhecer variações de cabeçalho e delimitador.
3. Revise os registros importados (inclusive cidade quando presente no arquivo).
4. Se necessário, faça ajustes manuais no cadastro.

---

## 4) Kanban (operação por etapa e cidade)
1. Abra **Kanban**.
2. Use busca por nome/telefone/e-mail.
3. Use filtro por **cidade** para segmentar operação local.
4. Mova pacientes entre colunas conforme evolução.
5. Para operação recorrente, crie **novos quadros**:
   - Defina cidade no filtro.
   - Informe nome do quadro.
   - Clique em **Criar quadro**.
6. Selecione quadros salvos quando quiser alternar visão.

---

## 5) Agenda e integrações de calendário

### 5.1 Google Agenda
1. No módulo de Agenda, conecte a conta Google.
2. Após conexão, eventos podem ser enviados para a agenda do Google.

### 5.2 Calendly → CRM
1. No módulo de Agenda, informe token do Calendly.
2. Clique para puxar dados do Calendly para o CRM.
3. O sistema vincula por e-mail/nome e cria/atualiza no CRM.

---

## 6) Disparo WhatsApp (Evolution API)

### 6.1 Conexão
1. No painel **WhatsApp**, conecte a Evolution.
2. Se necessário, selecione instância existente ou crie nova.

### 6.2 Segmentação
Você pode filtrar destinatários por:
- Etapa do tratamento
- Cidade

### 6.3 Modelos prontos
- Selecione um modelo pronto no seletor.
- Variável suportada: `{{nome}}`.
- Também é possível criar novos modelos personalizados e remover modelos personalizados selecionados.

### 6.4 Segurança anti-bloqueio
Antes de disparar, configure:
- Delay entre envios (ms)
- Quantidade por lote
- Pausa entre lotes (ms)

Esses controles reduzem risco de bloqueio por volume excessivo.

### 6.5 Padrão de número
O CRM normaliza o telefone para o padrão esperado pelo WhatsApp/Evolution (incluindo DDI 55 quando aplicável).

---

## 7) Boas práticas operacionais
1. Evite disparos massivos sem aquecimento de número.
2. Use segmentação por cidade e etapa para melhorar conversão.
3. Atualize Kanban diariamente.
4. Revise logs de erro no painel WhatsApp após campanhas.
5. Mantenha modelos curtos, claros e com CTA (chamada para ação).

---

## 8) Checklist diário
- [ ] Verificar novos leads/pacientes
- [ ] Atualizar etapas no Kanban
- [ ] Validar agenda do dia
- [ ] Executar campanhas segmentadas
- [ ] Revisar falhas de envio e corrigir cadastros

