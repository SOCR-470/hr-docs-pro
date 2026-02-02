import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  RefreshCw,
  Palmtree,
  Stethoscope,
  Baby,
  Heart,
  Briefcase,
  FileText,
  Users
} from "lucide-react";

const statusColors: Record<string, string> = {
  acquiring: "bg-blue-100 text-blue-800",
  available: "bg-green-100 text-green-800",
  scheduled: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  acquiring: "Adquirindo",
  available: "Disponível",
  scheduled: "Agendada",
  in_progress: "Em Andamento",
  completed: "Concluída",
  expired: "Vencida",
};

const requestStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-blue-100 text-blue-800",
};

const requestStatusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
  in_progress: "Em Andamento",
  completed: "Concluída",
};

const leaveTypeLabels: Record<string, string> = {
  medical: "Licença Médica",
  accident: "Acidente de Trabalho",
  maternity: "Licença Maternidade",
  paternity: "Licença Paternidade",
  bereavement: "Licença Nojo",
  wedding: "Licença Casamento",
  military: "Serviço Militar",
  jury_duty: "Júri",
  donation: "Doação de Sangue",
  other: "Outro",
};

const leaveTypeIcons: Record<string, any> = {
  medical: Stethoscope,
  accident: AlertTriangle,
  maternity: Baby,
  paternity: Baby,
  bereavement: Heart,
  wedding: Heart,
  military: Briefcase,
  jury_duty: FileText,
  donation: Heart,
  other: FileText,
};

export default function Vacations() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedVacation, setSelectedVacation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sellDays, setSellDays] = useState("0");
  const [advance13th, setAdvance13th] = useState(false);
  const [notes, setNotes] = useState("");
  
  // Leave form states
  const [leaveEmployee, setLeaveEmployee] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveCid, setLeaveCid] = useState("");
  const [leaveDoctorName, setLeaveDoctorName] = useState("");
  const [leaveDoctorCrm, setLeaveDoctorCrm] = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");
  
  const utils = trpc.useUtils();
  
  // Queries
  const { data: summary } = trpc.vacations.summary.useQuery();
  const { data: periods } = trpc.vacations.periods.useQuery({});
  const { data: expiring } = trpc.vacations.expiring.useQuery({ days: 30 });
  const { data: requests } = trpc.vacationRequests.list.useQuery({});
  const { data: leaves } = trpc.leaves.list.useQuery({});
  const { data: leaveSummary } = trpc.leaves.summary.useQuery();
  const { data: employees } = trpc.employees.list.useQuery({});
  
  // Mutations
  const initializeMutation = trpc.vacations.initialize.useMutation({
    onSuccess: () => {
      toast.success("Períodos de férias inicializados com sucesso!");
      utils.vacations.periods.invalidate();
      utils.vacations.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const createRequestMutation = trpc.vacationRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação de férias criada com sucesso!");
      setShowRequestDialog(false);
      resetRequestForm();
      utils.vacationRequests.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const approveRequestMutation = trpc.vacationRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Férias aprovadas com sucesso!");
      utils.vacationRequests.list.invalidate();
      utils.vacations.periods.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const rejectRequestMutation = trpc.vacationRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedRequest(null);
      utils.vacationRequests.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const createLeaveMutation = trpc.leaves.create.useMutation({
    onSuccess: () => {
      toast.success("Afastamento registrado com sucesso!");
      setShowLeaveDialog(false);
      resetLeaveForm();
      utils.leaves.list.invalidate();
      utils.leaves.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const resetRequestForm = () => {
    setSelectedEmployee("");
    setSelectedVacation("");
    setStartDate("");
    setEndDate("");
    setSellDays("0");
    setAdvance13th(false);
    setNotes("");
  };
  
  const resetLeaveForm = () => {
    setLeaveEmployee("");
    setLeaveType("");
    setLeaveStartDate("");
    setLeaveEndDate("");
    setLeaveCid("");
    setLeaveDoctorName("");
    setLeaveDoctorCrm("");
    setLeaveNotes("");
  };
  
  const handleCreateRequest = () => {
    if (!selectedEmployee || !selectedVacation || !startDate || !endDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    createRequestMutation.mutate({
      employeeId: parseInt(selectedEmployee),
      vacationId: parseInt(selectedVacation),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      sellDays: parseInt(sellDays),
      advance13th,
      notes: notes || undefined,
    });
  };
  
  const handleCreateLeave = () => {
    if (!leaveEmployee || !leaveType || !leaveStartDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    createLeaveMutation.mutate({
      employeeId: parseInt(leaveEmployee),
      leaveType: leaveType as any,
      startDate: new Date(leaveStartDate),
      endDate: leaveEndDate ? new Date(leaveEndDate) : undefined,
      cid: leaveCid || undefined,
      doctorName: leaveDoctorName || undefined,
      doctorCrm: leaveDoctorCrm || undefined,
      notes: leaveNotes || undefined,
    });
  };
  
  const handleReject = () => {
    if (!selectedRequest || !rejectReason) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    
    rejectRequestMutation.mutate({
      id: selectedRequest,
      reason: rejectReason,
    });
  };
  
  // Get employee vacations for select
  const employeeVacations = selectedEmployee 
    ? periods?.filter((p: any) => p.employee?.id === parseInt(selectedEmployee) && p.vacation.status === 'available')
    : [];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Férias e Afastamentos</h1>
            <p className="text-slate-400 mt-1">Gerencie férias, licenças e afastamentos dos funcionários</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${initializeMutation.isPending ? 'animate-spin' : ''}`} />
              Inicializar Períodos
            </Button>
            <Button onClick={() => setShowLeaveDialog(true)}>
              <Stethoscope className="h-4 w-4 mr-2" />
              Registrar Afastamento
            </Button>
            <Button onClick={() => setShowRequestDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Solicitar Férias
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Férias Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{summary?.available || 0}</div>
              <p className="text-xs text-slate-500">funcionários podem tirar férias</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Vencendo em 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{summary?.expiringIn30Days || 0}</div>
              <p className="text-xs text-slate-500">férias próximas de vencer</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{summary?.inProgress || 0}</div>
              <p className="text-xs text-slate-500">funcionários de férias</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Afastamentos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{leaveSummary?.activeCount || 0}</div>
              <p className="text-xs text-slate-500">funcionários afastados</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Expiring Alert */}
        {expiring && expiring.length > 0 && (
          <Card className="bg-yellow-900/20 border-yellow-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Férias Vencendo
              </CardTitle>
              <CardDescription className="text-yellow-300/70">
                Os seguintes funcionários têm férias vencendo nos próximos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expiring.slice(0, 5).map((item: any) => (
                  <div key={item.vacation.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <div>
                      <span className="font-medium text-slate-200">{item.employee.name}</span>
                      <span className="text-slate-400 text-sm ml-2">
                        {item.vacation.remainingDays} dias restantes
                      </span>
                    </div>
                    <span className="text-yellow-400 text-sm">
                      Vence em {new Date(item.vacation.concessivePeriodEnd).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="requests">Solicitações</TabsTrigger>
            <TabsTrigger value="leaves">Afastamentos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Períodos de Férias</CardTitle>
                <CardDescription className="text-slate-400">
                  Todos os períodos de férias dos funcionários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Funcionário</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Período Aquisitivo</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Vencimento</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Dias</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods?.map((item: any) => (
                        <tr key={item.vacation.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{item.employee.name}</div>
                            <div className="text-sm text-slate-400">{item.employee.position}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(item.vacation.acquisitivePeriodStart).toLocaleDateString('pt-BR')} - {new Date(item.vacation.acquisitivePeriodEnd).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(item.vacation.concessivePeriodEnd).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-green-400 font-medium">{item.vacation.remainingDays}</span>
                            <span className="text-slate-500">/{item.vacation.totalDays}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={statusColors[item.vacation.status]}>
                              {statusLabels[item.vacation.status]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="requests" className="mt-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Solicitações de Férias</CardTitle>
                <CardDescription className="text-slate-400">
                  Gerencie as solicitações de férias dos funcionários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Funcionário</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Período</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Dias</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Venda</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">13º</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests?.map((item: any) => (
                        <tr key={item.request.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{item.employee.name}</div>
                            <div className="text-sm text-slate-400">{item.employee.position}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(item.request.startDate).toLocaleDateString('pt-BR')} - {new Date(item.request.endDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {item.request.daysRequested}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {item.request.sellDays || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.request.advance13th ? (
                              <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-500 mx-auto" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={requestStatusColors[item.request.status]}>
                              {requestStatusLabels[item.request.status]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.request.status === 'pending' && (
                              <div className="flex justify-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-green-400 border-green-400 hover:bg-green-400/10"
                                  onClick={() => approveRequestMutation.mutate({ id: item.request.id })}
                                >
                                  Aprovar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-400 border-red-400 hover:bg-red-400/10"
                                  onClick={() => {
                                    setSelectedRequest(item.request.id);
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  Rejeitar
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!requests || requests.length === 0) && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Nenhuma solicitação de férias encontrada
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="leaves" className="mt-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Afastamentos</CardTitle>
                <CardDescription className="text-slate-400">
                  Licenças médicas, maternidade, paternidade e outros afastamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Funcionário</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Tipo</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Período</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">CID/Médico</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">INSS</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves?.map((item: any) => {
                        const Icon = leaveTypeIcons[item.leave.leaveType] || FileText;
                        return (
                          <tr key={item.leave.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-200">{item.employee.name}</div>
                              <div className="text-sm text-slate-400">{item.employee.position}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-300">{leaveTypeLabels[item.leave.leaveType]}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {new Date(item.leave.startDate).toLocaleDateString('pt-BR')}
                              {item.leave.endDate && ` - ${new Date(item.leave.endDate).toLocaleDateString('pt-BR')}`}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {item.leave.cid && <div>CID: {item.leave.cid}</div>}
                              {item.leave.doctorName && <div className="text-sm text-slate-400">{item.leave.doctorName}</div>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.leave.inssRequired ? (
                                <Badge className={item.leave.inssProtocol ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                  {item.leave.inssProtocol ? "Encaminhado" : "Necessário"}
                                </Badge>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={item.leave.status === 'active' ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}>
                                {item.leave.status === 'active' ? 'Ativo' : item.leave.status === 'completed' ? 'Concluído' : 'Cancelado'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {(!leaves || leaves.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Nenhum afastamento registrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Request Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Solicitar Férias</DialogTitle>
              <DialogDescription className="text-slate-400">
                Crie uma nova solicitação de férias para um funcionário
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Funcionário</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedEmployee && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Período de Férias</Label>
                  <Select value={selectedVacation} onValueChange={setSelectedVacation}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeVacations?.map((item: any) => (
                        <SelectItem key={item.vacation.id} value={item.vacation.id.toString()}>
                          {new Date(item.vacation.acquisitivePeriodStart).toLocaleDateString('pt-BR')} - {item.vacation.remainingDays} dias disponíveis
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Data Início</Label>
                  <Input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Data Fim</Label>
                  <Input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Vender dias (máx. 10)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="10"
                  value={sellDays}
                  onChange={(e) => setSellDays(e.target.value)}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Adiantar 13º salário</Label>
                <Switch checked={advance13th} onCheckedChange={setAdvance13th} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Observações</Label>
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRequest} disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? "Criando..." : "Criar Solicitação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Leave Dialog */}
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Registrar Afastamento</DialogTitle>
              <DialogDescription className="text-slate-400">
                Registre uma licença ou afastamento de funcionário
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Funcionário</Label>
                <Select value={leaveEmployee} onValueChange={setLeaveEmployee}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo de Afastamento</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(leaveTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Data Início</Label>
                  <Input 
                    type="date" 
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Data Fim (previsão)</Label>
                  <Input 
                    type="date" 
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              
              {(leaveType === 'medical' || leaveType === 'accident') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-300">CID</Label>
                    <Input 
                      value={leaveCid}
                      onChange={(e) => setLeaveCid(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                      placeholder="Ex: J11"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Nome do Médico</Label>
                      <Input 
                        value={leaveDoctorName}
                        onChange={(e) => setLeaveDoctorName(e.target.value)}
                        className="bg-slate-700 border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">CRM</Label>
                      <Input 
                        value={leaveDoctorCrm}
                        onChange={(e) => setLeaveDoctorCrm(e.target.value)}
                        className="bg-slate-700 border-slate-600"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label className="text-slate-300">Observações</Label>
                <Textarea 
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateLeave} disabled={createLeaveMutation.isPending}>
                {createLeaveMutation.isPending ? "Registrando..." : "Registrar Afastamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Rejeitar Solicitação</DialogTitle>
              <DialogDescription className="text-slate-400">
                Informe o motivo da rejeição
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-slate-700 border-slate-600"
                placeholder="Motivo da rejeição..."
                rows={4}
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={rejectRequestMutation.isPending}
              >
                {rejectRequestMutation.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
