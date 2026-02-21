# Tutorial Inicial (Super Simples) — CRM

Este guia foi feito para quem está começando agora.

## 1) O que é cada módulo
- **Dashboard**: visão geral rápida.
- **Pacientes**: cadastro, edição, importação e exportação.
- **Agenda**: controle de consultas + Google/Calendly.
- **Kanban**: etapas do paciente (funil de acompanhamento).
- **WhatsApp**: disparos em lote pela Evolution API.
- **Configurações**: dados da clínica e conexões.

---

## 2) Primeiro uso (ordem recomendada)
1. Abra **Configurações** e salve dados da clínica.
2. Vá em **Pacientes** e cadastre 1 paciente teste.
3. Vá em **Kanban** e mova esse paciente de etapa.
4. Vá em **WhatsApp**, conecte Evolution e envie 1 teste.
5. Vá em **Agenda** e valide integração de calendário.

---

## 3) Pacientes — botões e inputs
### Botões
- **Novo Paciente**: cria cadastro.
- **Importar CSV**: entra lista em lote.
- **Exportar CSV**: baixa lista.
- **Editar**: altera dados já salvos.

### Inputs principais
- **Nome Completo** (obrigatório)
- **Telefone** (obrigatório)
- **Cidade** (muito importante)
- **E-mail** (recomendado)

---

## 4) Kanban — botões e inputs
### Inputs/Filtros
- **Buscar paciente** (nome/telefone/e-mail)
- **Cidade** (filtra o quadro)

### Botões
- **Criar quadro**: salva visão com filtro atual.
- **Remover quadro**: exclui visão salva.
- **Botões de etapa nos cards**: movem o paciente entre colunas.

---

## 5) Agenda — botões e inputs
### Botões
- **Nova consulta**
- **Conectar Google**
- **Puxar Calendly → CRM**

### Inputs
- Paciente, data, hora e observações.

---

## 6) WhatsApp (Evolution API) — muito simples

### 6.1 Conectar API
1. Clique **Conectar Evolution**.
2. Escolha instância no seletor.
3. Se não tiver instância, clique **Criar nova instância**.

### 6.2 Disparar mensagem
1. Escolha **Filtro por Etapa** e **Filtro por Cidade**.
2. Selecione **Modelo pronto** ou escreva mensagem.
3. Clique **Iniciar disparo**.

### 6.3 Botões e campos importantes
- **Salvar modelo**: cria novo modelo pronto.
- **Remover modelo personalizado**: exclui modelo criado por você.
- **Último log de erro**: mostra por que algum envio falhou.

### 6.4 Anti-bloqueio (proteção do número)
- **Delay entre envios (ms)**
- **Qtd por lote**
- **Pausa entre lotes (ms)**

Use esses 3 campos para evitar envio agressivo e reduzir risco de bloqueio.

---

## 7) Configurações — o que preencher
- Nome da clínica
- Responsável
- Timezone
- Chaves/tokens das integrações

Depois clique em **Salvar**.

---

## 8) Rotina diária recomendada
1. Ver novos pacientes.
2. Atualizar Kanban.
3. Conferir Agenda.
4. Fazer campanhas no WhatsApp por cidade/etapa.
5. Ver logs de erro e corrigir contatos.

