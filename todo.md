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


## Fase 5 - Módulo de Audiências Judiciais

### Cadastro de Processos Trabalhistas
- [x] Número do processo (formato CNJ), vara, tribunal
- [x] Reclamante (ex-funcionário ou atual) - vinculado ao cadastro de funcionários
- [x] Tipo de ação (trabalhista, acidente de trabalho, assédio, dano moral, etc.)
- [x] Advogado responsável, escritório
- [x] Status do processo (ativo, arquivado, acordo, condenação, absolvição)
- [x] Integração com API do Escavador para busca automática

### Gestão de Audiências
- [x] Calendário visual com filtros por tipo/status
- [x] Data, hora, local, tipo (inicial, instrução, julgamento, conciliação)
- [ ] Alertas automáticos (7 dias, 3 dias, 1 dia antes)
- [x] Vinculação com processo

### Documentação do Processo
- [x] Upload de petições, contestações, provas
- [x] Vinculação com documentos do funcionário (ponto, holerite, contratos)
- [ ] Checklist de documentos necessários por tipo de audiência
- [x] Organização por pastas/categorias

### Preparação para Audiência
- [x] Lista de testemunhas convocadas
- [x] Pontos-chave para defesa
- [ ] Histórico de ocorrências do funcionário
- [x] Anotações e estratégia

### Prazos Processuais
- [x] Controle de prazos para contestação, recursos, manifestações
- [ ] Alertas automáticos de prazos vencendo
- [ ] Cálculo considerando dias úteis/feriados forenses

### Comunicações do Tribunal
- [x] Caixa de entrada para emails/intimações
- [x] Upload manual de publicações do diário oficial
- [x] Vinculação automática com processo correspondente
- [x] Preparação para integração com Escavador

### Histórico de Movimentações
- [x] Timeline completa do processo
- [x] Sincronização via Escavador (quando API key configurada)
- [ ] Alertas de novas movimentações

### Acompanhamento Financeiro
- [x] Valor da causa, provisão contábil
- [x] Custas processuais, honorários advocatícios
- [x] Resultado financeiro (acordo, condenação, absolvição)
- [x] Controle de parcelas de acordos

### Gestão de Acordos
- [x] Simulador de acordo vs. risco de condenação
- [x] Registro de propostas e contrapropostas
- [x] Controle de parcelas e alertas de vencimento

### Dashboard Jurídico
- [x] Visão geral de processos ativos
- [x] Próximas audiências (7 dias)
- [x] Prazos críticos
- [x] Provisão total do passivo trabalhista
- [x] Métricas de sucesso/insucesso

### Relatórios
- [x] Processos por departamento/período
- [x] Taxa de sucesso nas defesas
- [x] Custo total com passivo trabalhista
- [ ] Exportação em PDF/Excel


## Fase 6 - Correções

### Bugs Reportados
- [x] Página de Comunicações do Tribunal retorna erro 404 - página criada e adicionada ao menu


## Fase 7 - Módulo de Modelos de Documentos

### Editor de Modelos
- [x] Cadastro de modelos (Contrato de Trabalho, Termo de EPI, Confidencialidade, etc.)
- [x] Editor de texto com variáveis ({{nome}}, {{cargo}}, {{salario}}, {{data_admissao}}, etc.)
- [x] Preview do documento com dados de exemplo
- [x] Categorização por tipo (admissão, segurança, benefícios, etc.)

### Variáveis Disponíveis
- [x] Dados do funcionário (nome, CPF, RG, endereço, etc.)
- [x] Dados profissionais (cargo, departamento, salário, horário, etc.)
- [x] Dados da empresa (razão social, CNPJ, endereço, etc.)
- [x] Datas (admissão, atual, por extenso, etc.)

### Geração de PDF
- [x] Preenchimento automático das variáveis com dados do funcionário
- [x] Geração de PDF formatado
- [x] Armazenamento no S3

### Envio para Assinatura
- [x] Seleção de funcionário e modelo
- [x] Geração do documento preenchido
- [x] Envio por email com link único de assinatura
- [x] Validade configurável do link

### Página Pública de Assinatura
- [x] Visualização do documento (sem login)
- [x] Validação de identidade (CPF + data nascimento)
- [x] Captura de assinatura (desenho ou digitada)
- [x] Registro de metadados (IP, data/hora, user agent)

### Finalização
- [x] PDF final com assinatura incorporada
- [x] Armazenamento na pasta do funcionário
- [x] Notificação ao RH sobre assinatura concluída
- [x] Histórico de documentos assinados


## Fase 8 - Funcionalidades Essenciais

### Gestão de Férias e Afastamentos
- [x] Tabela de férias no banco de dados (período aquisitivo, concessivo, saldo)
- [x] Tabela de afastamentos (licença médica, maternidade, etc.)
- [x] CRUD de solicitações de férias
- [x] Workflow de aprovação de férias
- [x] Cálculo automático de período aquisitivo/concessivo
- [x] Alertas de férias vencendo (prazo legal 12 meses)
- [ ] Geração automática de aviso e recibo de férias
- [x] Dashboard de férias por departamento
- [ ] Calendário visual de férias da equipe

### Gestão de Benefícios
- [x] Tabela de tipos de benefícios (VT, VR/VA, plano de saúde, etc.)
- [x] Tabela de benefícios por funcionário
- [x] CRUD de benefícios
- [x] Controle de valores e descontos
- [x] Relatório de custos com benefícios por departamento
- [ ] Alertas de vencimento de contratos com fornecedores
- [x] Histórico de alterações de benefícios

### Onboarding/Offboarding Automatizado
- [x] Tabela de checklists de onboarding/offboarding
- [x] Tabela de itens de checklist
- [x] Tabela de progresso por funcionário
- [x] Checklist padrão de admissão (documentos, acessos, treinamentos)
- [x] Checklist padrão de demissão (devolução, revogação de acessos)
- [x] Workflow com responsáveis e prazos
- [x] Acompanhamento de progresso em tempo real
- [ ] Integração com modelos de documentos existentes
- [ ] Notificações automáticas para responsáveis

### Notificações Consolidadas
- [x] Tabela de preferências de notificação por usuário
- [x] Tabela de notificações pendentes
- [x] Resumo diário por email para gestores
- [x] Resumo semanal por email
- [ ] Notificações de documentos pendentes para funcionários
- [ ] Lembretes automáticos de vencimentos
- [x] Painel de notificações no sistema (bell icon)
- [x] Configuração de preferências de notificação

## Fase 9 - Calendário Visual de Férias

### Calendário Visual
- [x] Componente de calendário mensal/anual
- [x] Visualização de férias aprovadas/agendadas por funcionário
- [x] Filtro por departamento
- [x] Cores diferenciadas por tipo (férias, afastamento)
- [x] Tooltip com detalhes ao passar o mouse
- [x] Navegação entre meses
- [x] Integração na página de Férias e Afastamentos
