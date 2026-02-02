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
import { toast } from "sonner";
import { 
  Plus, 
  RefreshCw,
  Bus,
  Utensils,
  Heart,
  Smile,
  Shield,
  GraduationCap,
  Baby,
  Dumbbell,
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  BarChart3
} from "lucide-react";

const categoryIcons: Record<string, any> = {
  transport: Bus,
  meal: Utensils,
  health: Heart,
  dental: Smile,
  life_insurance: Shield,
  pension: DollarSign,
  education: GraduationCap,
  childcare: Baby,
  gym: Dumbbell,
  other: DollarSign,
};

const categoryLabels: Record<string, string> = {
  transport: "Transporte",
  meal: "Alimentação",
  health: "Saúde",
  dental: "Odontológico",
  life_insurance: "Seguro de Vida",
  pension: "Previdência",
  education: "Educação",
  childcare: "Creche",
  gym: "Academia",
  other: "Outro",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

export default function Benefits() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  
  // Form states for assigning benefit
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedBenefitType, setSelectedBenefitType] = useState("");
  const [companyValue, setCompanyValue] = useState("");
  const [employeeDiscount, setEmployeeDiscount] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState("");
  const [dependentsCount, setDependentsCount] = useState("0");
  const [notes, setNotes] = useState("");
  
  // Form states for new benefit type
  const [typeName, setTypeName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [typeCategory, setTypeCategory] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [typeHasContribution, setTypeHasContribution] = useState(false);
  const [typeMaxContribution, setTypeMaxContribution] = useState("");
  
  const utils = trpc.useUtils();
  
  // Queries
  const { data: summary } = trpc.employeeBenefits.summary.useQuery();
  const { data: benefitTypes } = trpc.benefitTypes.list.useQuery({});
  const { data: employeeBenefits } = trpc.employeeBenefits.list.useQuery({});
  const { data: costsByDepartment } = trpc.employeeBenefits.costsByDepartment.useQuery();
  const { data: costsByType } = trpc.employeeBenefits.costsByType.useQuery();
  const { data: employees } = trpc.employees.list.useQuery({});
  
  // Mutations
  const createDefaultsMutation = trpc.benefitTypes.createDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} tipos de benefícios criados!`);
      utils.benefitTypes.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const createTypeMutation = trpc.benefitTypes.create.useMutation({
    onSuccess: () => {
      toast.success("Tipo de benefício criado com sucesso!");
      setShowTypeDialog(false);
      resetTypeForm();
      utils.benefitTypes.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const assignBenefitMutation = trpc.employeeBenefits.assign.useMutation({
    onSuccess: () => {
      toast.success("Benefício atribuído com sucesso!");
      setShowAssignDialog(false);
      resetAssignForm();
      utils.employeeBenefits.list.invalidate();
      utils.employeeBenefits.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const cancelBenefitMutation = trpc.employeeBenefits.cancel.useMutation({
    onSuccess: () => {
      toast.success("Benefício cancelado");
      utils.employeeBenefits.list.invalidate();
      utils.employeeBenefits.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const resetAssignForm = () => {
    setSelectedEmployee("");
    setSelectedBenefitType("");
    setCompanyValue("");
    setEmployeeDiscount("0");
    setStartDate("");
    setPlanName("");
    setPlanType("");
    setDependentsCount("0");
    setNotes("");
  };
  
  const resetTypeForm = () => {
    setTypeName("");
    setTypeCode("");
    setTypeCategory("");
    setTypeDescription("");
    setTypeHasContribution(false);
    setTypeMaxContribution("");
  };
  
  const handleAssignBenefit = () => {
    if (!selectedEmployee || !selectedBenefitType || !companyValue || !startDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    assignBenefitMutation.mutate({
      employeeId: parseInt(selectedEmployee),
      benefitTypeId: parseInt(selectedBenefitType),
      companyValue,
      employeeDiscount: employeeDiscount || "0",
      startDate: new Date(startDate),
      planName: planName || undefined,
      planType: planType || undefined,
      dependentsCount: parseInt(dependentsCount) || 0,
      notes: notes || undefined,
    });
  };
  
  const handleCreateType = () => {
    if (!typeName || !typeCode || !typeCategory) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    createTypeMutation.mutate({
      name: typeName,
      code: typeCode,
      category: typeCategory as any,
      description: typeDescription || undefined,
      hasEmployeeContribution: typeHasContribution,
      maxEmployeeContributionPercent: typeMaxContribution || undefined,
    });
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const selectedType = benefitTypes?.find((t: any) => t.id.toString() === selectedBenefitType);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Gestão de Benefícios</h1>
            <p className="text-slate-400 mt-1">Gerencie os benefícios dos funcionários</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => createDefaultsMutation.mutate()}
              disabled={createDefaultsMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${createDefaultsMutation.isPending ? 'animate-spin' : ''}`} />
              Criar Tipos Padrão
            </Button>
            <Button variant="outline" onClick={() => setShowTypeDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
            <Button onClick={() => setShowAssignDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Atribuir Benefício
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total de Benefícios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{summary?.totalBenefits || 0}</div>
              <p className="text-xs text-slate-500">{summary?.totalEmployeesWithBenefits || 0} funcionários</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Custo Empresa (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(summary?.totalCompanyValue || 0)}
              </div>
              <p className="text-xs text-slate-500">valor total pago</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Desconto Funcionários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {formatCurrency(summary?.totalEmployeeDiscount || 0)}
              </div>
              <p className="text-xs text-slate-500">coparticipação</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Custo Líquido (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {formatCurrency(summary?.netCost || 0)}
              </div>
              <p className="text-xs text-slate-500">
                {formatCurrency((summary?.netCost || 0) * 12)}/ano
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="types">Tipos de Benefícios</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Benefícios por Funcionário</CardTitle>
                <CardDescription className="text-slate-400">
                  Lista de todos os benefícios ativos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Funcionário</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Benefício</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Valor Empresa</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Desconto</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Status</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeBenefits?.map((item: any) => {
                        const Icon = categoryIcons[item.type.category] || DollarSign;
                        return (
                          <tr key={item.benefit.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-200">{item.employee.name}</div>
                              <div className="text-sm text-slate-400">{item.employee.position}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-slate-700">
                                  <Icon className="h-4 w-4 text-slate-300" />
                                </div>
                                <div>
                                  <div className="font-medium text-slate-200">{item.type.name}</div>
                                  <div className="text-sm text-slate-400">{item.type.code}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-green-400 font-medium">
                              {formatCurrency(parseFloat(item.benefit.companyValue))}
                            </td>
                            <td className="py-3 px-4 text-right text-yellow-400">
                              {formatCurrency(parseFloat(item.benefit.employeeDiscount || '0'))}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={statusColors[item.benefit.status]}>
                                {statusLabels[item.benefit.status]}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.benefit.status === 'active' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-400 border-red-400 hover:bg-red-400/10"
                                  onClick={() => cancelBenefitMutation.mutate({ id: item.benefit.id })}
                                >
                                  Cancelar
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {(!employeeBenefits || employeeBenefits.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Nenhum benefício atribuído
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="types" className="mt-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100">Tipos de Benefícios</CardTitle>
                <CardDescription className="text-slate-400">
                  Tipos de benefícios disponíveis para atribuição
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {benefitTypes?.map((type: any) => {
                    const Icon = categoryIcons[type.category] || DollarSign;
                    return (
                      <Card key={type.id} className="bg-slate-700/50 border-slate-600">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-slate-600">
                              <Icon className="h-5 w-5 text-slate-300" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-slate-200">{type.name}</h3>
                                <Badge variant="outline" className="text-slate-400">
                                  {type.code}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-400 mt-1">
                                {categoryLabels[type.category]}
                              </p>
                              {type.hasEmployeeContribution && (
                                <p className="text-xs text-yellow-400 mt-2">
                                  Coparticipação: até {type.maxEmployeeContributionPercent}%
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {(!benefitTypes || benefitTypes.length === 0) && (
                    <div className="col-span-full py-8 text-center text-slate-400">
                      Nenhum tipo de benefício cadastrado. Clique em "Criar Tipos Padrão" para começar.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports" className="mt-4 space-y-4">
            {/* By Department */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Custos por Departamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Departamento</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Funcionários</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Benefícios</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Custo Empresa</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Descontos</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Custo Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costsByDepartment?.map((dept: any) => (
                        <tr key={dept.departmentId || 'none'} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-medium text-slate-200">{dept.departmentName}</td>
                          <td className="py-3 px-4 text-center text-slate-300">{dept.employeeCount}</td>
                          <td className="py-3 px-4 text-center text-slate-300">{dept.benefitCount}</td>
                          <td className="py-3 px-4 text-right text-green-400">{formatCurrency(dept.totalCompanyValue)}</td>
                          <td className="py-3 px-4 text-right text-yellow-400">{formatCurrency(dept.totalEmployeeDiscount)}</td>
                          <td className="py-3 px-4 text-right text-purple-400 font-medium">{formatCurrency(dept.netCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* By Type */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Custos por Tipo de Benefício
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium">Benefício</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Categoria</th>
                        <th className="text-center py-3 px-4 text-slate-400 font-medium">Funcionários</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Custo Empresa</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Descontos</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-medium">Custo Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costsByType?.map((type: any) => {
                        const Icon = categoryIcons[type.category] || DollarSign;
                        return (
                          <tr key={type.typeId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-200">{type.typeName}</span>
                                <Badge variant="outline" className="text-slate-400">{type.typeCode}</Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-300">{categoryLabels[type.category]}</td>
                            <td className="py-3 px-4 text-center text-slate-300">{type.employeeCount}</td>
                            <td className="py-3 px-4 text-right text-green-400">{formatCurrency(type.totalCompanyValue)}</td>
                            <td className="py-3 px-4 text-right text-yellow-400">{formatCurrency(type.totalEmployeeDiscount)}</td>
                            <td className="py-3 px-4 text-right text-purple-400 font-medium">{formatCurrency(type.netCost)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Assign Benefit Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Atribuir Benefício</DialogTitle>
              <DialogDescription className="text-slate-400">
                Atribua um benefício a um funcionário
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
                <Label className="text-slate-300">Tipo de Benefício</Label>
                <Select value={selectedBenefitType} onValueChange={setSelectedBenefitType}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Selecione o benefício" />
                  </SelectTrigger>
                  <SelectContent>
                    {benefitTypes?.map((type: any) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} ({type.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Valor Empresa (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={companyValue}
                    onChange={(e) => setCompanyValue(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Desconto Funcionário (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={employeeDiscount}
                    onChange={(e) => setEmployeeDiscount(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                    placeholder="0.00"
                  />
                </div>
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
              
              {selectedType?.category === 'health' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Nome do Plano</Label>
                      <Input 
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        className="bg-slate-700 border-slate-600"
                        placeholder="Ex: Unimed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Tipo do Plano</Label>
                      <Input 
                        value={planType}
                        onChange={(e) => setPlanType(e.target.value)}
                        className="bg-slate-700 border-slate-600"
                        placeholder="Ex: Apartamento"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Número de Dependentes</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={dependentsCount}
                      onChange={(e) => setDependentsCount(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </>
              )}
              
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
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAssignBenefit} disabled={assignBenefitMutation.isPending}>
                {assignBenefitMutation.isPending ? "Atribuindo..." : "Atribuir Benefício"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* New Type Dialog */}
        <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Novo Tipo de Benefício</DialogTitle>
              <DialogDescription className="text-slate-400">
                Crie um novo tipo de benefício
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nome</Label>
                  <Input 
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                    placeholder="Ex: Vale Transporte"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Código</Label>
                  <Input 
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                    className="bg-slate-700 border-slate-600"
                    placeholder="Ex: VT"
                    maxLength={10}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Categoria</Label>
                <Select value={typeCategory} onValueChange={setTypeCategory}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Descrição</Label>
                <Textarea 
                  value={typeDescription}
                  onChange={(e) => setTypeDescription(e.target.value)}
                  className="bg-slate-700 border-slate-600"
                  placeholder="Descrição do benefício..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTypeDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateType} disabled={createTypeMutation.isPending}>
                {createTypeMutation.isPending ? "Criando..." : "Criar Tipo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
