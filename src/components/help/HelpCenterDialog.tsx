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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Central de Ajuda do CRM</DialogTitle>
          <DialogDescription>
            Guia rápido para configurar todos os módulos e operar corretamente no dia a dia.
          </DialogDescription>
        </DialogHeader>

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="inicio">
            <AccordionTrigger>1) Como começar (primeiros passos)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Acesse Configurações e preencha dados da clínica.</p>
              <p>2. Conecte as integrações necessárias (Google/Calendly/Evolution).</p>
              <p>3. Cadastre/importe pacientes com telefone e cidade.</p>
              <p>4. Organize por etapas no Kanban.</p>
              <p>5. Faça disparos segmentados no WhatsApp com segurança de envio.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pacientes">
            <AccordionTrigger>2) Módulo Pacientes</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Use “Novo Paciente” para cadastro manual.</p>
              <p>• Campo Cidade ajuda a filtrar Kanban, lista e campanhas.</p>
              <p>• Importação CSV aceita variações de cabeçalho e delimitador.</p>
              <p>• Revise dados importados e normalize contatos antes de campanhas.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="kanban">
            <AccordionTrigger>3) Módulo Kanban</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Acompanhe pacientes por etapa de tratamento.</p>
              <p>• Filtre por cidade para operação local.</p>
              <p>• Crie quadros salvos para reutilizar filtros recorrentes.</p>
              <p>• Atualize etapas diariamente para manter previsibilidade da operação.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="agenda">
            <AccordionTrigger>4) Módulo Agenda (Google + Calendly)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Conecte Google para enviar eventos à agenda.</p>
              <p>• Use sincronização do Calendly para puxar agendamentos para o CRM.</p>
              <p>• Em bases grandes, priorize conferência diária das novas entradas.</p>
              <p>• Ative notificações no navegador para lembretes operacionais.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="whatsapp">
            <AccordionTrigger>5) Módulo WhatsApp (Evolution API)</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Conecte a instância da Evolution e valide envio teste.</p>
              <p>• Segmente por etapa e cidade antes de disparar.</p>
              <p>• Use modelos prontos ou crie seus próprios modelos personalizados.</p>
              <p>• Configure proteção anti-bloqueio: delay, lote e pausa entre lotes.</p>
              <p>• Revise logs de erro para corrigir contatos inválidos.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="configuracoes">
            <AccordionTrigger>6) Módulo Configurações</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Preencha dados institucionais da clínica.</p>
              <p>• Armazene credenciais de integração por usuário.</p>
              <p>• Revise periodicamente tokens/chaves para evitar falhas de conexão.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="boas-praticas">
            <AccordionTrigger>7) Boas práticas de uso correto</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Evite alto volume sem intervalo: use throttling de envio.</p>
              <p>• Mantenha cidade e telefone sempre atualizados no cadastro.</p>
              <p>• Atualize Kanban após cada contato/consulta.</p>
              <p>• Faça rotina diária: novos leads, agenda, campanhas e erros.</p>
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
