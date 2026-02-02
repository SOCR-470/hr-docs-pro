import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Plus, 
  RefreshCw,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  UserPlus,
  UserMinus,
  FileText,
  Laptop,
  Key,
  GraduationCap,
  Briefcase,
  ChevronRight,
  Play,
  XCircle
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  documents: FileText,
  equipment: Laptop,
  access: Key,
  training: GraduationCap,
  administrative: Briefcase,
};

const categoryLabels: Record<string, string> = {
  documents: "Documentos",
  equipment: "Equipamentos",
  access: "Acessos",
  training: "Treinamentos",
  administrative: "Administrativo",
};

const roleLabels: Record<string, string> = {
  hr: "RH",
  it: "TI",
  manager: "Gestor",
  finance: "Financeiro",
  employee: "Funcionário",
};

const statusIcons: Record<string, any> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  skipped: XCircle,
  blocked: AlertTriangle,
};

const statusColors: Record<string, string> = {
  pending: "text-slate-400",
  in_progress: "text-yellow-400",
  completed: "text-green-400",
  skipped: "text-slate-500",
  blocked: "text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluído",
  skipped: "Pulado",
  blocked: "Bloqueado",
};

const checklistStatusColors: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const checklistStatusLabels: Record<string, string> = {
  not_started: "Não Iniciado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function Checklists() {
  const [activeTab, setActiveTab] = useState("active");
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<number | null>(null);
  const [checklistType, setChecklistType] = useState<"onboarding" | "offboarding">("onboarding");
  
  // Form states
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const utils = trpc.useUtils();
  
  // Queries
  const { data: summary } = trpc.employeeChecklists.summary.useQuery();
  const { data: checklists } = trpc.employeeChecklists.list.useQuery({});
  const { data: overdue } = trpc.employeeChecklists.overdue.useQuery();
  const { data: templates } = trpc.checklistTemplates.list.useQuery({});
  const { data: employees } = trpc.employees.list.useQuery({});
  const { data: checklistProgress } = trpc.employeeChecklists.get.useQuery(
    { id: selectedChecklist! },
    { enabled: !!selectedChecklist }
  );
  
  // Mutations
  const createDefaultsMutation = trpc.checklistTemplates.createDefaults.useMutation({
    onSuccess: (data) => {
      toast.success("Templates padrão criados com sucesso!");
      utils.checklistTemplates.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const startChecklistMutation = trpc.employeeChecklists.start.useMutation({
    onSuccess: () => {
      toast.success("Checklist iniciado com sucesso!");
      setShowStartDialog(false);
      resetStartForm();
      utils.employeeChecklists.list.invalidate();
      utils.employeeChecklists.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateItemStatusMutation = trpc.employeeChecklists.updateItemStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.employeeChecklists.get.invalidate({ id: selectedChecklist! });
      utils.employeeChecklists.list.invalidate();
      utils.employeeChecklists.summary.invalidate();
      utils.employeeChecklists.overdue.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const resetStartForm = () => {
    setSelectedEmployee("");
    setSelectedTemplate("");
    setStartDate(new Date().toISOString().split('T')[0]);
  };
  
  const handleStartChecklist = () => {
    if (!selectedEmployee || !selectedTemplate || !startDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    startChecklistMutation.mutate({
      employeeId: parseInt(selectedEmployee),
      templateId: parseInt(selectedTemplate),
      type: checklistType,
      startDate: new Date(startDate),
    });
  };
  
  const handleUpdateItemStatus = (itemProgressId: number, status: string) => {
    updateItemStatusMutation.mutate({
      itemProgressId,
      status: status as any,
    });
  };
  
  const openDetails = (checklistId: number) => {
    setSelectedChecklist(checklistId);
    setShowDetailsDialog(true);
  };
  
  const filteredTemplates = templates?.filter((t: any) => t.type === checklistType);
  
  const activeChecklists = checklists?.filter((c: any) => 
    c.checklist.status === 'in_progress' || c.checklist.status === 'not_started'
  );
  
  const completedChecklists = checklists?.filter((c: any) => 
    c.checklist.status === 'completed' || c.checklist.status === 'cancelled'
  );
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Onboarding & Offboarding</h1>
            <p className="text-slate-400 mt-1">Gerencie checklists de admissão e desligamento</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => createDefaultsMutation.mutate()}
              disabled={createDefaultsMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${createDefaultsMutation.isPending ? 'animate-spin' : ''}`} />
              Criar Templates Padrão
            </Button>
            <Button onClick={() => {
              setChecklistType("offboarding");
              setShowStartDialog(true);
            }} variant="outline" className="text-red-400 border-red-400 hover:bg-red-400/10">
              <UserMinus className="h-4 w-4 mr-2" />
              Iniciar Offboarding
            </Button>
            <Button onClick={() => {
              setChecklistType("onboarding");
              setShowStartDialog(true);
            }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Iniciar Onboarding
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Onboardings Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{summary?.activeOnboarding || 0}</div>
              <p className="text-xs text-slate-500">funcionários em admissão</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Offboardings Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{summary?.activeOffboarding || 0}</div>
              <p className="text-xs text-slate-500">funcionários em desligamento</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Tarefas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{summary?.pendingTasks || 0}</div>
              <p className="text-xs text-slate-500">itens a concluir</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Tarefas Atrasadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{summary?.overdueTasks || 0}</div>
              <p className="text-xs text-slate-500">itens em atraso</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Overdue Alert */}
        {overdue && overdue.length > 0 && (
          <Card className="bg-orange-900/20 border-orange-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-orange-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Tarefas Atrasadas
              </CardTitle>
              <CardDescription className="text-orange-300/70">
                As seguintes tarefas estão atrasadas e precisam de atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdue.slice(0, 5).map((item: any) => (
                  <div key={item.itemProgress.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <div>
                      <span className="font-medium text-slate-200">{item.employee.name}</span>
                      <span className="text-slate-400 text-sm ml-2">
                        {item.item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-slate-400">
                        {roleLabels[item.item.responsibleRole]}
                      </Badge>
                      <span className="text-orange-400 text-sm">
                        {item.itemProgress.daysOverdue} dias atrasado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="active">Em Andamento</TabsTrigger>
            <TabsTrigger value="completed">Concluídos</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeChecklists?.map((item: any) => (
                <Card key={item.checklist.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => openDetails(item.checklist.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {item.checklist.type === 'onboarding' ? (
                          <div className="p-2 rounded-lg bg-green-500/20">
                            <UserPlus className="h-5 w-5 text-green-400" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-red-500/20">
                            <UserMinus className="h-5 w-5 text-red-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium text-slate-200">{item.employee.name}</h3>
                          <p className="text-sm text-slate-400">{item.employee.position}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-500" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Progresso</span>
                        <span className="text-slate-300">{item.checklist.completedItems}/{item.checklist.totalItems}</span>
                      </div>
                      <Progress value={(item.checklist.completedItems / item.checklist.totalItems) * 100} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                      <span className="text-xs text-slate-500">
                        Iniciado em {new Date(item.checklist.startDate).toLocaleDateString('pt-BR')}
                      </span>
                      <Badge className={checklistStatusColors[item.checklist.status]}>
                        {checklistStatusLabels[item.checklist.status]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!activeChecklists || activeChecklists.length === 0) && (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum checklist em andamento</p>
                  <p className="text-sm mt-1">Inicie um onboarding ou offboarding para começar</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Checklists Concluídos</CardTitle>
                <CardDescription className="text-slate-400">
                  Histórico de onboardings e offboardings finalizados
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
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Itens</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedChecklists?.map((item: any) => (
                        <tr key={item.checklist.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer" onClick={() => openDetails(item.checklist.id)}>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">{item.employee.name}</div>
                            <div className="text-sm text-slate-400">{item.employee.position}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {item.checklist.type === 'onboarding' ? (
                                <UserPlus className="h-4 w-4 text-green-400" />
                              ) : (
                                <UserMinus className="h-4 w-4 text-red-400" />
                              )}
                              <span className="text-slate-300">
                                {item.checklist.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {new Date(item.checklist.startDate).toLocaleDateString('pt-BR')}
                            {item.checklist.completedAt && ` - ${new Date(item.checklist.completedAt).toLocaleDateString('pt-BR')}`}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {item.checklist.completedItems}/{item.checklist.totalItems}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={checklistStatusColors[item.checklist.status]}>
                              {checklistStatusLabels[item.checklist.status]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {(!completedChecklists || completedChecklists.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Nenhum checklist concluído
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Onboarding Templates */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-green-400" />
                    Templates de Onboarding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {templates?.filter((t: any) => t.type === 'onboarding').map((template: any) => (
                      <div key={template.id} className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-200">{template.name}</h4>
                            <p className="text-sm text-slate-400">{template.description}</p>
                          </div>
                          {template.isDefault && (
                            <Badge variant="outline" className="text-green-400 border-green-400">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {templates?.filter((t: any) => t.type === 'onboarding').length === 0 && (
                      <p className="text-slate-400 text-center py-4">
                        Nenhum template de onboarding. Clique em "Criar Templates Padrão".
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Offboarding Templates */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <UserMinus className="h-5 w-5 text-red-400" />
                    Templates de Offboarding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {templates?.filter((t: any) => t.type === 'offboarding').map((template: any) => (
                      <div key={template.id} className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-200">{template.name}</h4>
                            <p className="text-sm text-slate-400">{template.description}</p>
                          </div>
                          {template.isDefault && (
                            <Badge variant="outline" className="text-red-400 border-red-400">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {templates?.filter((t: any) => t.type === 'offboarding').length === 0 && (
                      <p className="text-slate-400 text-center py-4">
                        Nenhum template de offboarding. Clique em "Criar Templates Padrão".
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Start Checklist Dialog */}
        <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-100 flex items-center gap-2">
                {checklistType === 'onboarding' ? (
                  <>
                    <UserPlus className="h-5 w-5 text-green-400" />
                    Iniciar Onboarding
                  </>
                ) : (
                  <>
                    <UserMinus className="h-5 w-5 text-red-400" />
                    Iniciar Offboarding
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {checklistType === 'onboarding' 
                  ? "Inicie o processo de admissão de um novo funcionário"
                  : "Inicie o processo de desligamento de um funcionário"
                }
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
              
              <div className="space-y-2">
                <Label className="text-slate-300">Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Selecione o template" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTemplates?.map((template: any) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Data de Início</Label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleStartChecklist} 
                disabled={startChecklistMutation.isPending}
                className={checklistType === 'offboarding' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <Play className="h-4 w-4 mr-2" />
                {startChecklistMutation.isPending ? "Iniciando..." : "Iniciar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                {checklistProgress?.checklist.type === 'onboarding' ? 'Onboarding' : 'Offboarding'} - {checklistProgress?.employee.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {checklistProgress?.employee.position} • Iniciado em {checklistProgress?.checklist.startDate && new Date(checklistProgress.checklist.startDate).toLocaleDateString('pt-BR')}
              </DialogDescription>
            </DialogHeader>
            
            {checklistProgress && (
              <div className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Progresso Geral</span>
                    <span className="text-slate-300">
                      {checklistProgress.checklist.completedItems}/{checklistProgress.checklist.totalItems} itens
                    </span>
                  </div>
                  <Progress 
                    value={((checklistProgress.checklist.completedItems || 0) / (checklistProgress.checklist.totalItems || 1)) * 100} 
                    className="h-3" 
                  />
                </div>
                
                {/* Items by Category */}
                {Object.entries(
                  checklistProgress.items.reduce((acc: any, item: any) => {
                    const cat = item.item.category;
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(item);
                    return acc;
                  }, {})
                ).map(([category, items]: [string, any]) => {
                  const Icon = categoryIcons[category] || Briefcase;
                  return (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-slate-200 flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {categoryLabels[category]}
                      </h4>
                      <div className="space-y-1">
                        {items.map((item: any) => {
                          const StatusIcon = statusIcons[item.progress.status];
                          return (
                            <div 
                              key={item.progress.id} 
                              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <StatusIcon className={`h-5 w-5 ${statusColors[item.progress.status]}`} />
                                <div>
                                  <div className="font-medium text-slate-200">{item.item.title}</div>
                                  {item.item.description && (
                                    <div className="text-sm text-slate-400">{item.item.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-slate-400">
                                  {roleLabels[item.item.responsibleRole]}
                                </Badge>
                                {item.progress.status !== 'completed' && (
                                  <Select 
                                    value={item.progress.status}
                                    onValueChange={(value) => handleUpdateItemStatus(item.progress.id, value)}
                                  >
                                    <SelectTrigger className="w-32 bg-slate-600 border-slate-500 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pendente</SelectItem>
                                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                                      <SelectItem value="completed">Concluído</SelectItem>
                                      <SelectItem value="skipped">Pular</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
