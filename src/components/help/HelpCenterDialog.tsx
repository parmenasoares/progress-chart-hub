import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HelpCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpCenterDialog({ open, onOpenChange }: HelpCenterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>AJUDA — Guia simples para iniciantes</DialogTitle>
          <DialogDescription>
            Explicação fácil de cada módulo, botão e campo (input), incluindo WhatsApp + conexão API.
          </DialogDescription>
        </DialogHeader>

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="inicio">
            <AccordionTrigger>1) Começo rápido (3 minutos)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Passo 1:</strong> abra <strong>Configurações</strong> e preencha dados básicos.</p>
              <p><strong>Passo 2:</strong> vá para <strong>Pacientes</strong> e cadastre 1 cliente teste.</p>
              <p><strong>Passo 3:</strong> vá para <strong>Kanban</strong> e mova o cliente entre colunas.</p>
              <p><strong>Passo 4:</strong> vá para <strong>WhatsApp</strong>, conecte a instância e envie um teste.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dashboard">
            <AccordionTrigger>2) Dashboard (tela inicial)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Para que serve:</strong> visão geral do CRM.</p>
              <p><strong>Botão “Sair”:</strong> encerra sua sessão com segurança.</p>
              <p><strong>Botão “AJUDA” (canto inferior):</strong> abre este guia em qualquer tela.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pacientes">
            <AccordionTrigger>3) Módulo Pacientes — botões e inputs</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Botões principais:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Novo Paciente:</strong> abre formulário de cadastro.</li>
                <li><strong>Importar CSV:</strong> sobe lista em massa.</li>
                <li><strong>Exportar CSV:</strong> baixa sua base.</li>
                <li><strong>Editar:</strong> altera dados do cliente.</li>
              </ul>
              <p><strong>Inputs mais importantes no cadastro:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Nome Completo</strong> (obrigatório)</li>
                <li><strong>Telefone</strong> (obrigatório)</li>
                <li><strong>Cidade</strong> (essencial para filtros e campanhas)</li>
                <li><strong>E-mail</strong> (ajuda em integração com agenda)</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="kanban">
            <AccordionTrigger>4) Módulo Kanban — botões e inputs</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Para que serve:</strong> acompanhar etapa de cada paciente.</p>
              <p><strong>Inputs/Filtros:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Buscar paciente</strong> (nome/telefone/e-mail)</li>
                <li><strong>Filtro de Cidade</strong></li>
              </ul>
              <p><strong>Botões:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Criar quadro:</strong> salva uma visão pronta (ex.: cidade específica).</li>
                <li><strong>Remover quadro:</strong> exclui visão salva selecionada.</li>
                <li><strong>Botões de etapa no card:</strong> movem paciente entre colunas.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="agenda">
            <AccordionTrigger>5) Módulo Agenda — botões e inputs</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Para que serve:</strong> controlar consultas e sincronizações.</p>
              <p><strong>Botões comuns:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Nova consulta:</strong> cria agendamento no CRM.</li>
                <li><strong>Conectar Google:</strong> integra com Google Agenda.</li>
                <li><strong>Puxar Calendly → CRM:</strong> traz eventos para dentro do CRM.</li>
              </ul>
              <p><strong>Inputs comuns:</strong> data, horário, paciente e observações.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="whatsapp">
            <AccordionTrigger>6) WhatsApp + Evolution API — explicação simples</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Objetivo:</strong> disparo em lote com segurança.</p>

              <p><strong>Conexão API (passo a passo):</strong></p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Clique <strong>Conectar Evolution</strong>.</li>
                <li>Selecione uma instância existente no seletor.</li>
                <li>Se não tiver, use <strong>Criar nova instância</strong>.</li>
              </ol>

              <p><strong>Botões e inputs do disparo:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Filtro por Etapa</strong> e <strong>Filtro por Cidade</strong> (segmentação).</li>
                <li><strong>Modelos prontos</strong> (seleciona mensagem rápida).</li>
                <li><strong>Salvar modelo</strong> (cria novo modelo personalizado).</li>
                <li><strong>Iniciar disparo</strong> (envia para os destinatários filtrados).</li>
                <li><strong>Último log de erro</strong> (mostra detalhe técnico de falha).</li>
              </ul>

              <p><strong>Anti-bloqueio (muito importante):</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Delay entre envios (ms):</strong> pausa entre mensagens.</li>
                <li><strong>Qtd por lote:</strong> quantas mensagens por bloco.</li>
                <li><strong>Pausa entre lotes (ms):</strong> descanso maior após cada bloco.</li>
              </ul>
              <p>Esses 3 campos ajudam a proteger seu número contra bloqueio por excesso de volume.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="configuracoes">
            <AccordionTrigger>7) Configurações — botões e inputs</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Para que serve:</strong> centralizar dados da clínica e integrações.</p>
              <p><strong>Inputs típicos:</strong> nome da clínica, responsável, timezone, tokens/chaves.</p>
              <p><strong>Botão Salvar:</strong> guarda suas configurações para uso nos módulos.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="checklist">
            <AccordionTrigger>8) Checklist diário (iniciante)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Verificar novos pacientes/importações.</p>
              <p>2. Atualizar etapas no Kanban.</p>
              <p>3. Confirmar agenda do dia.</p>
              <p>4. Disparar campanhas segmentadas (etapa + cidade).</p>
              <p>5. Ver logs de erro do WhatsApp e corrigir contatos.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Fechar ajuda</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
