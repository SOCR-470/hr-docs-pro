import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Scale, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  FileText,
  Users,
  Building2,
  Gavel,
  ChevronRight,
  RefreshCw,
  Settings
} from "lucide-react";
import { Link } from "wouter";

export default function LegalDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: stats, isLoading: statsLoading } = trpc.lawsuits.stats.useQuery();
  const { data: upcomingHearings } = trpc.hearings.upcoming.useQuery({ days: 7 });
  const { data: upcomingDeadlines } = trpc.deadlines.upcoming.useQuery({ days: 7 });
  const { data: lawsuitsByDept } = trpc.lawsuits.byDepartment.useQuery();
  const { data: lawsuitsByType } = trpc.lawsuits.byType.useQuery();
  const { data: escavadorStatus } = trpc.escavador.status.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-blue-100 text-blue-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800",
      settled: "bg-yellow-100 text-yellow-800",
      archived: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      labor_claim: "Reclamação Trabalhista",
      work_accident: "Acidente de Trabalho",
      occupational_disease: "Doença Ocupacional",
      moral_damage: "Dano Moral",
      harassment: "Assédio",
      wrongful_termination: "Rescisão Indevida",
      salary_differences: "Diferenças Salariais",
      overtime: "Horas Extras",
      other: "Outros",
    };
    return labels[type] || type;
  };

  const getHearingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initial: "Inicial",
      conciliation: "Conciliação",
      instruction: "Instrução",
      judgment: "Julgamento",
      other: "Outra",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" />
            Jurídico
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestão de processos trabalhistas e audiências
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/lawsuits/new">
            <Button>
              <Gavel className="h-4 w-4 mr-2" />
              Novo Processo
            </Button>
          </Link>
          <Link href="/legal/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </Link>
        </div>
      </div>

      {/* Escavador Status */}
      {escavadorStatus && (
        <Card className={escavadorStatus.isActive ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${escavadorStatus.isActive ? "text-green-600" : "text-yellow-600"}`} />
                <span className="text-sm">
                  {escavadorStatus.isActive 
                    ? `Escavador ativo - Monitorando ${escavadorStatus.monitoredCompanyName || escavadorStatus.monitoredCnpj || "empresa"}`
                    : "Escavador não configurado - Configure para monitoramento automático"}
                </span>
              </div>
              {escavadorStatus.lastSyncAt && (
                <span className="text-xs text-muted-foreground">
                  Última sincronização: {formatDate(escavadorStatus.lastSyncAt)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {statsLoading ? "..." : stats?.active || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats?.total || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {statsLoading ? "..." : stats?.total ? Math.round(((stats.won + stats.settled) / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.won || 0} ganhos, {stats?.settled || 0} acordos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Provisão Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {statsLoading ? "..." : formatCurrency(stats?.totalProvisionAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Passivo trabalhista
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor das Causas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {statsLoading ? "..." : formatCurrency(stats?.totalClaimAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total reclamado
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="hearings">Audiências</TabsTrigger>
          <TabsTrigger value="deadlines">Prazos</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Próximas Audiências */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Próximas Audiências
                  </CardTitle>
                  <Link href="/hearings">
                    <Button variant="ghost" size="sm">
                      Ver todas <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Audiências nos próximos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingHearings && upcomingHearings.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingHearings.slice(0, 5).map((item) => (
                      <div key={item.hearing.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">
                            {item.lawsuit?.processNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getHearingTypeLabel(item.hearing.hearingType)} - {item.hearing.location || "Local não definido"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm text-primary">
                            {formatDate(item.hearing.scheduledDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.hearing.scheduledTime || "Horário não definido"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma audiência nos próximos 7 dias
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Prazos Críticos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Prazos Críticos
                  </CardTitle>
                  <Link href="/deadlines">
                    <Button variant="ghost" size="sm">
                      Ver todos <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                <CardDescription>Prazos vencendo nos próximos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingDeadlines.slice(0, 5).map((item) => (
                      <div key={item.deadline.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">
                            {item.deadline.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Processo: {item.lawsuit?.processNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            new Date(item.deadline.dueDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
                              ? "destructive"
                              : "secondary"
                          }>
                            {formatDate(item.deadline.dueDate)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum prazo nos próximos 7 dias
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Processos por Departamento e Tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Processos por Departamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lawsuitsByDept && lawsuitsByDept.length > 0 ? (
                  <div className="space-y-3">
                    {lawsuitsByDept.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{item.departmentName || "Sem departamento"}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum processo cadastrado
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Processos por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lawsuitsByType && lawsuitsByType.length > 0 ? (
                  <div className="space-y-3">
                    {lawsuitsByType.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{getTypeLabel(item.type)}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum processo cadastrado
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hearings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Calendário de Audiências</CardTitle>
                <Link href="/hearings">
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Calendário Completo
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingHearings && upcomingHearings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingHearings.map((item) => (
                    <div key={item.hearing.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{item.lawsuit?.processNumber}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.lawsuit?.claimantName}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge>{getHearingTypeLabel(item.hearing.hearingType)}</Badge>
                            {item.hearing.isVirtual && (
                              <Badge variant="outline">Virtual</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">
                            {formatDate(item.hearing.scheduledDate)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.hearing.scheduledTime}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.hearing.location}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma audiência agendada
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prazos Processuais</CardTitle>
                <Link href="/deadlines">
                  <Button>
                    <Clock className="h-4 w-4 mr-2" />
                    Gerenciar Prazos
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
                <div className="space-y-4">
                  {upcomingDeadlines.map((item) => {
                    const daysLeft = Math.ceil((new Date(item.deadline.dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                    return (
                      <div key={item.deadline.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{item.deadline.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Processo: {item.lawsuit?.processNumber}
                            </p>
                            {item.deadline.description && (
                              <p className="text-sm mt-2">{item.deadline.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant={daysLeft <= 3 ? "destructive" : daysLeft <= 7 ? "secondary" : "outline"}>
                              {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Vence em {formatDate(item.deadline.dueDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum prazo pendente
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Resultado dos Processos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Ganhos</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${stats?.total ? (stats.won / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats?.won || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Acordos</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-500" 
                          style={{ width: `${stats?.total ? (stats.settled / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats?.settled || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Perdidos</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500" 
                          style={{ width: `${stats?.total ? (stats.lost / stats.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{stats?.lost || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Valor Total das Causas</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(stats?.totalClaimAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Provisão Contábil</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(stats?.totalProvisionAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Total em Acordos</span>
                    <span className="font-bold text-yellow-600">
                      {formatCurrency(stats?.totalSettlementAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Total em Condenações</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(stats?.totalCondemnationAmount || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/lawsuits">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <Gavel className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Processos</p>
                <p className="text-xs text-muted-foreground">Gerenciar todos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/hearings">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Audiências</p>
                <p className="text-xs text-muted-foreground">Calendário</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lawyers">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Advogados</p>
                <p className="text-xs text-muted-foreground">Cadastro</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/court-communications">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">Comunicações</p>
                <p className="text-xs text-muted-foreground">Tribunal</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
