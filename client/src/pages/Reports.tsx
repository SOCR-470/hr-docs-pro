import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  FileText, 
  Mail, 
  Calendar, 
  Download, 
  Eye, 
  Clock, 
  Plus,
  Trash2,
  Send,
  BarChart3,
  Users,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function Reports() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [emailRecipients, setEmailRecipients] = useState<string>("");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    type: "weekly" as "daily" | "weekly" | "monthly",
    recipients: "",
  });

  // Queries
  const { data: reportPreview, isLoading: previewLoading, refetch: refetchPreview } = trpc.reports.preview.useQuery(
    selectedDepartment ? { departmentId: parseInt(selectedDepartment) } : undefined
  );
  const { data: schedules, refetch: refetchSchedules } = trpc.reports.schedules.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();

  // Mutations
  const generateReport = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório gerado com sucesso!");
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: () => toast.error("Erro ao gerar relatório"),
  });

  const sendReport = trpc.reports.sendByEmail.useMutation({
    onSuccess: () => toast.success("Relatório enviado por email!"),
    onError: () => toast.error("Erro ao enviar relatório"),
  });

  const createSchedule = trpc.reports.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado!");
      setShowScheduleDialog(false);
      refetchSchedules();
      setNewSchedule({ name: "", type: "weekly", recipients: "" });
    },
    onError: () => toast.error("Erro ao criar agendamento"),
  });

  const deleteSchedule = trpc.reports.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Agendamento removido!");
      refetchSchedules();
    },
    onError: () => toast.error("Erro ao remover agendamento"),
  });

  const handleGenerateReport = () => {
    generateReport.mutate(
      selectedDepartment ? { departmentId: parseInt(selectedDepartment) } : undefined
    );
  };

  const handleSendReport = () => {
    const recipients = emailRecipients.split(",").map(e => e.trim()).filter(e => e);
    if (recipients.length === 0) {
      toast.error("Informe pelo menos um email");
      return;
    }
    sendReport.mutate({ recipients });
  };

  const handleCreateSchedule = () => {
    const recipients = newSchedule.recipients.split(",").map(e => e.trim()).filter(e => e);
    if (!newSchedule.name || recipients.length === 0) {
      toast.error("Preencha todos os campos");
      return;
    }
    createSchedule.mutate({
      name: newSchedule.name,
      type: newSchedule.type,
      recipients,
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: "Diário",
      weekly: "Semanal",
      monthly: "Mensal",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios de Compliance</h1>
          <p className="text-slate-500">Gere e agende relatórios automáticos de conformidade</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="w-4 h-4 mr-2" />
                Agendar Envio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agendar Relatório Automático</DialogTitle>
                <DialogDescription>
                  Configure o envio automático de relatórios por email
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Agendamento</Label>
                  <Input
                    placeholder="Ex: Relatório Semanal RH"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={newSchedule.type}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destinatários (separados por vírgula)</Label>
                  <Input
                    placeholder="email1@empresa.com, email2@empresa.com"
                    value={newSchedule.recipients}
                    onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSchedule} disabled={createSchedule.isPending}>
                  {createSchedule.isPending ? "Criando..." : "Criar Agendamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleGenerateReport} disabled={generateReport.isPending}>
            <FileText className="w-4 h-4 mr-2" />
            {generateReport.isPending ? "Gerando..." : "Gerar Relatório"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Prévia
          </TabsTrigger>
          <TabsTrigger value="send">
            <Mail className="w-4 h-4 mr-2" />
            Enviar por Email
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Calendar className="w-4 h-4 mr-2" />
            Agendamentos
          </TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Prévia do Relatório</CardTitle>
                  <CardDescription>
                    Visualize os dados antes de gerar ou enviar
                  </CardDescription>
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todos os departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os departamentos</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : reportPreview ? (
                <div className="space-y-6">
                  {/* Summary Metrics */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                      <div className="text-2xl font-bold text-blue-700">
                        {reportPreview.summary.totalEmployees}
                      </div>
                      <div className="text-sm text-blue-600">Funcionários</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4 text-center">
                      <BarChart3 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                      <div className="text-2xl font-bold text-emerald-700">
                        {reportPreview.summary.avgComplianceScore}%
                      </div>
                      <div className="text-sm text-emerald-600">Score Médio</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto text-amber-600 mb-2" />
                      <div className="text-2xl font-bold text-amber-700">
                        {reportPreview.summary.openAlerts}
                      </div>
                      <div className="text-sm text-amber-600">Alertas Abertos</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                      <div className="text-2xl font-bold text-red-700">
                        {reportPreview.summary.criticalAlerts}
                      </div>
                      <div className="text-sm text-red-600">Críticos</div>
                    </div>
                  </div>

                  {/* Department Stats */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Compliance por Departamento</h3>
                    <div className="space-y-3">
                      {reportPreview.departmentStats.map((dept) => (
                        <div key={dept.id} className="flex items-center gap-4">
                          <div className="w-32 text-sm font-medium">{dept.name}</div>
                          <div className="flex-1">
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  dept.avgScore >= 80
                                    ? "bg-emerald-500"
                                    : dept.avgScore >= 60
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${dept.avgScore}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-16 text-right font-semibold">
                            {dept.avgScore}%
                          </div>
                          <Badge variant="outline">{dept.employeeCount} func.</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Alerts */}
                  {reportPreview.topAlerts.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Alertas Prioritários</h3>
                      <div className="space-y-2">
                        {reportPreview.topAlerts.slice(0, 5).map((alert) => (
                          <div
                            key={alert.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={
                                  alert.severity === "critical"
                                    ? "destructive"
                                    : alert.severity === "high"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {alert.severity}
                              </Badge>
                              <span className="font-medium">{alert.title}</span>
                            </div>
                            <span className="text-sm text-slate-500">{alert.employeeName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Employees at Risk */}
                  {reportPreview.employeesAtRisk.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-3">Funcionários em Risco</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {reportPreview.employeesAtRisk.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                          >
                            <div>
                              <div className="font-medium text-red-900">{emp.name}</div>
                              <div className="text-sm text-red-600">{emp.department}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-700">{emp.score}%</div>
                              <div className="text-xs text-red-500">{emp.alertCount} alertas</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Tab */}
        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Relatório por Email</CardTitle>
              <CardDescription>
                Envie o relatório de compliance para os destinatários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Destinatários (separados por vírgula)</Label>
                <Input
                  placeholder="email1@empresa.com, email2@empresa.com"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                />
              </div>
              <Button onClick={handleSendReport} disabled={sendReport.isPending}>
                <Send className="w-4 h-4 mr-2" />
                {sendReport.isPending ? "Enviando..." : "Enviar Relatório"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos Ativos</CardTitle>
              <CardDescription>
                Relatórios configurados para envio automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedules && schedules.length > 0 ? (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${schedule.enabled ? "bg-emerald-100" : "bg-slate-200"}`}>
                          <Calendar className={`w-5 h-5 ${schedule.enabled ? "text-emerald-600" : "text-slate-400"}`} />
                        </div>
                        <div>
                          <div className="font-medium">{schedule.name}</div>
                          <div className="text-sm text-slate-500">
                            {schedule.recipients.join(", ")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={schedule.enabled ? "default" : "secondary"}>
                          {getTypeLabel(schedule.type)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSchedule.mutate({ id: schedule.id })}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhum agendamento configurado</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowScheduleDialog(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Agendamento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
