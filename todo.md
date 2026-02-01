# HR Docs Pro - TODO

## Core Infrastructure
- [x] Schema do banco de dados (employees, documents, recurring_docs, alerts, external_requests)
- [x] Routers tRPC para todas as entidades
- [x] Integração com GPT-4.1-mini Vision para OCR e análise

## Autenticação e Roles
- [x] Sistema de autenticação com roles (admin/RH)
- [x] Proteção de rotas por role

## Dashboard de Compliance
- [x] Métricas de conformidade por funcionário
- [x] Métricas de conformidade por departamento
- [x] Gráficos de status documental
- [x] Alertas prioritários em destaque

## Gestão de Funcionários
- [x] CRUD completo de funcionários
- [x] Pastas organizadas por funcionário
- [x] Pacote padrão de documentos obrigatórios
- [x] Filtros por departamento e status
- [x] Busca inteligente

## Gestão de Documentos
- [x] Upload de documentos de admissão
- [x] Categorização automática via IA
- [x] Visualização de progresso documental
- [x] Controle de vencimentos

## Documentos Recorrentes
- [x] Upload de ponto diário
- [x] Upload de holerite mensal
- [x] OCR via GPT-4.1-mini Vision
- [x] Extração automática de dados

## Análise de Conformidade via IA
- [x] Análise de ponto (atrasos, horas extras, inconsistências)
- [x] Análise de holerite (cálculos, descontos irregulares)
- [x] Score de conformidade por funcionário
- [x] Timeline de eventos/irregularidades

## Sistema de Alertas
- [x] Alertas proativos de não conformidade
- [x] Severidade e priorização
- [x] Notificações em tempo real
- [x] Histórico de alertas

## Solicitações Externas
- [x] Geração de links seguros
- [x] Upload sem autenticação (página pública)
- [x] Expiração automática de links
- [ ] Notificação por email (SendGrid - futuro)

## Chatbot (Futuro)
- [x] Placeholder "Em Desenvolvimento" no frontend
- [x] Rota stub no backend

## Dados de Demonstração
- [x] Seed de funcionários (10 funcionários)
- [x] Seed de departamentos (5 departamentos)
- [x] Seed de tipos de documentos (15 tipos)
- [x] Seed de alertas de compliance

## Testes
- [x] Testes unitários para routers principais
- [x] Teste de autenticação/logout

## Melhorias em Desenvolvimento

### Integração SendGrid (Emails)
- [x] Configurar serviço SendGrid no backend
- [x] Envio de email para solicitações externas
- [x] Templates de email profissionais
- [x] Log de emails enviados com timestamp

### Relatórios Automáticos de Compliance
- [x] Geração de relatório PDF com métricas
- [x] Agendamento de envio (diário/semanal/mensal)
- [x] Relatório por departamento
- [x] Histórico de relatórios gerados

### Integração Ponto Eletrônico
- [x] API para importação automática de ponto
- [x] Upload manual como alternativa
- [x] Processamento em lote de arquivos
- [x] Validação e reconciliação de dados

## Pendente para Futuro
- [ ] Backup automático diário
- [ ] Implementação completa do chatbot
- [ ] Integração com folha de pagamento
- [ ] Integração com Active Directory
