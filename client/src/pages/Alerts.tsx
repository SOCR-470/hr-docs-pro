import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  User,
  FileWarning,
  XCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Alerts() {
  const [, setLocation] = useLocation();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: alerts, isLoading, refetch } = trpc.alerts.list.useQuery({
    severity: severityFilter !== "all" ? severityFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
  });

  const resolveAlert = trpc.alerts.resolve.useMutation({
    onSuccess: () => {
      toast.success("Alerta resolvido com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const dismissAlert = trpc.alerts.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Alerta descartado");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const severityConfig = {
    critical: { color: 'bg-red-100 text-red-700 border-red-200', icon: 'text-red-600', bg: 'bg-red-50' },
    high: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: 'text-orange-600', bg: 'bg-orange-50' },
    medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'text-amber-600', bg: 'bg-amber-50' },
    low: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'text-slate-600', bg: 'bg-slate-50' },
  };

  const statusConfig = {
    open: { color: 'bg-red-100 text-red-700', label: 'Aberto' },
    acknowledged: { color: 'bg-amber-100 text-amber-700', label: 'Reconhecido' },
    resolved: { color: 'bg-emerald-100 text-emerald-700', label: 'Resolvido' },
    dismissed: { color: 'bg-slate-100 text-slate-700', label: 'Descartado' },
  };

  const openAlerts = alerts?.filter((a: any) => a.status === 'open').length || 0;
  const criticalAlerts = alerts?.filter((a: any) => a.severity === 'critical' && a.status === 'open').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alertas de Compliance</h1>
          <p className="text-slate-500 mt-1">Monitore e resolva não conformidades</p>
        </div>
        <div className="flex items-center gap-4">
          {criticalAlerts > 0 && (
            <Badge className="bg-red-100 text-red-700 px-3 py-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {criticalAlerts} crítico{criticalAlerts > 1 ? 's' : ''}
            </Badge>
          )}
          <Badge className={openAlerts > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} >
            {openAlerts} aberto{openAlerts !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="acknowledged">Reconhecidos</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
                <SelectItem value="dismissed">Descartados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
            const status = statusConfig[alert.status as keyof typeof statusConfig] || statusConfig.open;
            
            return (
              <Card key={alert.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg ${severity.bg}`}>
                      <FileWarning className={`h-5 w-5 ${severity.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                        <Badge variant="outline" className={severity.color}>
                          {alert.severity}
                        </Badge>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        {alert.employee && (
                          <button 
                            onClick={() => setLocation(`/employees/${alert.employeeId}`)}
                            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          >
                            <User className="h-3 w-3" />
                            {alert.employee.name}
                          </button>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        {alert.alertType && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded">
                            {alert.alertType}
                          </span>
                        )}
                      </div>
                    </div>
                    {alert.status === 'open' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissAlert.mutate({ id: alert.id })}
                          disabled={dismissAlert.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Descartar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => resolveAlert.mutate({ id: alert.id, resolution: 'Resolvido manualmente' })}
                          disabled={resolveAlert.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolver
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-emerald-300 mb-4" />
              <h3 className="text-lg font-medium text-emerald-600">Tudo em conformidade!</h3>
              <p className="text-slate-500 mt-1">
                {severityFilter !== "all" || statusFilter !== "all"
                  ? "Nenhum alerta encontrado com os filtros selecionados"
                  : "Não há alertas pendentes no momento"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
