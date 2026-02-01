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

## Novas Melhorias (Fase 2)

### Organização por Departamento
- [ ] Estrutura de pastas: Departamento > Funcionário
- [ ] Navegação hierárquica no frontend
- [ ] Filtros e busca por departamento

### Templates de Pacotes Documentais
- [x] CRUD de templates por cargo/função
- [x] Sistema de herança (template base + específico)
- [x] Configuração de obrigatoriedade, vencimento e tipo de obtenção
- [ ] Aplicação automática ao cadastrar funcionário
- [x] Dashboard de progresso por template

### Envio de Documentos para Terceiros
- [x] Seleção via checkbox de documentos da pasta
- [x] Geração de link seguro (sem acesso ao sistema)
- [x] Envio por email com validade configurável
- [x] Log de compartilhamentos

### Módulo LGPD (Consentimento)
- [x] Termo de consentimento único (não granular)
- [x] Envio por email com link para assinatura
- [x] Validação: nome + CPF + data nascimento + código email
- [x] Opção de impressão para assinatura física
- [x] Registro com metadados (IP, data/hora, hash)
- [ ] Comprovante PDF gerado automaticamente

### Geração de Contratos e Documentos
- [x] Modelos auto-preenchidos com dados do funcionário
- [x] Contrato de trabalho, termo de confidencialidade, etc.
- [x] Envio para assinatura eletrônica
- [x] Opção de impressão
- [ ] Nomenclatura automática: [TIPO]_[NOME]_[DATA].pdf

### Análise Preditiva
- [x] Score de risco (0-100) por funcionário
- [x] Previsão de problemas nos próximos 30 dias
- [x] Detecção de padrões de comportamento
- [x] Alertas preditivos

### Análise Comparativa
- [x] Evolução individual mês a mês
- [x] Benchmark entre departamentos
- [x] Comparativo holerite vs. contrato
- [x] Histórico de alertas ao longo do tempo

## Fase 3 - Melhorias Solicitadas

### Integração de Envio de Emails
- [x] Configurar serviço de notificação para envio de emails
- [x] Envio automático de links de consentimento LGPD
- [x] Envio automático de links de compartilhamento de documentos
- [x] Templates de email profissionais em HTML

### Geração de PDF para Comprovantes LGPD
- [x] Gerar PDF de comprovante após assinatura de consentimento LGPD
- [x] Incluir dados do funcionário, data/hora, IP e hash no PDF
- [x] Armazenar PDF no S3 e vincular ao registro de consentimento

### Aplicação Automática de Templates por Cargo/Função
- [x] Vincular templates a cargos/funções no banco de dados
- [x] Aplicar template automaticamente ao cadastrar novo funcionário
- [x] Criar documentos pendentes na pasta do funcionário baseado no template
- [x] Permitir adicionar documentos extras posteriormente à pasta do colaborador
- [x] Interface para gerenciar vinculação template-cargo

## Fase 4 - Correções e Melhorias

### Bugs Reportados
- [x] Documentos triplicados no select de templates (página de funcionário) - removidos do banco
- [x] Documentos triplicados no select de envio de documentos - removidos do banco
- [x] Botão de envio para assinatura não funciona (apenas simulação) - implementado envio real

### Melhorias Solicitadas
- [x] Dashboard: Expandir compliance por departamento ao clicar, mostrando funcionários e scores
- [x] Detalhes do funcionário: Mostrar dados completos (admissão, cargo, dados pessoais, horário, departamento)
- [x] Envio de documentos para assinatura: Usar email do funcionário cadastrado, solicitar quando ausente

