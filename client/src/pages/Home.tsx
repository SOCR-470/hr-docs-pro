import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  FileWarning,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const complianceColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-700 border-red-200";
      case "high": return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard de Compliance</h1>
        <p className="text-slate-500 mt-1">Visão geral do status de conformidade de RH</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Funcionários</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {stats?.totalEmployees || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Score Médio</p>
                <p className={`text-3xl font-bold mt-1 ${complianceColor(stats?.avgComplianceScore || 0)}`}>
                  {stats?.avgComplianceScore || 0}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Alertas Abertos</p>
                <p className={`text-3xl font-bold mt-1 ${(stats?.openAlerts || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {stats?.openAlerts || 0}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${(stats?.openAlerts || 0) > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                <AlertTriangle className={`h-6 w-6 ${(stats?.openAlerts || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Conformes</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {stats?.departmentStats?.filter((d: any) => Number(d.avgCompliance) >= 80).length || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">departamentos</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance by Department */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Compliance por Departamento</CardTitle>
            <CardDescription>Score médio de conformidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.departmentStats && stats.departmentStats.length > 0 ? (
              stats.departmentStats.map((dept: any) => (
                <div key={dept.departmentId || 'no-dept'} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {dept.departmentName || 'Sem Departamento'}
                    </span>
                    <span className={`text-sm font-bold ${complianceColor(Number(dept.avgCompliance) || 0)}`}>
                      {Math.round(Number(dept.avgCompliance) || 0)}%
                    </span>
                  </div>
                  <Progress 
                    value={Number(dept.avgCompliance) || 0} 
                    className="h-2"
                  />
                  <p className="text-xs text-slate-400">{dept.employeeCount} funcionários</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhum departamento cadastrado</p>
                <p className="text-sm mt-1">Adicione funcionários para ver as métricas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Alertas Recentes</CardTitle>
              <CardDescription>Últimas não conformidades detectadas</CardDescription>
            </div>
            <button 
              onClick={() => setLocation('/alerts')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos
            </button>
          </CardHeader>
          <CardContent>
            {stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
              <div className="space-y-3">
                {stats.recentAlerts.slice(0, 5).map((alert: any) => (
                  <div 
                    key={alert.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/employees/${alert.employeeId}`)}
                  >
                    <div className={`p-1.5 rounded ${
                      alert.severity === 'critical' ? 'bg-red-100' :
                      alert.severity === 'high' ? 'bg-orange-100' :
                      'bg-amber-100'
                    }`}>
                      <FileWarning className={`h-4 w-4 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'high' ? 'text-orange-600' :
                        'text-amber-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {alert.title}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${severityColor(alert.severity)}`}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {alert.employee?.name || 'Funcionário'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-300" />
                <p className="font-medium text-emerald-600">Tudo em conformidade!</p>
                <p className="text-sm mt-1">Nenhum alerta pendente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
