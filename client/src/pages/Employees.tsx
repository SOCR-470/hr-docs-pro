import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Plus, 
  User,
  Building2,
  ChevronRight,
  Filter
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Employees() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const { data: employees, isLoading, refetch } = trpc.employees.list.useQuery({
    search: search || undefined,
    departmentId: departmentFilter !== "all" ? parseInt(departmentFilter) : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  
  const { data: departments } = trpc.departments.list.useQuery();
  
  const applyTemplates = trpc.templateApplication.applyToEmployee.useMutation({
    onSuccess: (result) => {
      if (result.createdDocuments > 0) {
        toast.success(`${result.createdDocuments} documentos pendentes criados automaticamente`);
      }
    },
  });

  const createEmployee = trpc.employees.create.useMutation({
    onSuccess: (employee) => {
      toast.success("Funcionário cadastrado com sucesso!");
      // Aplicar templates automaticamente baseado no cargo/departamento
      applyTemplates.mutate({ 
        employeeId: employee.id, 
        skipExisting: true 
      });
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    },
  });

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    position: "",
    departmentId: "",
    workHours: "08:00-17:00",
  });

  const handleCreateEmployee = () => {
    if (!newEmployee.name || !newEmployee.cpf) {
      toast.error("Nome e CPF são obrigatórios");
      return;
    }
    createEmployee.mutate({
      ...newEmployee,
      departmentId: newEmployee.departmentId ? parseInt(newEmployee.departmentId) : undefined,
    });
  };

  const complianceColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50";
    if (score >= 50) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativo</Badge>;
      case "inactive": return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Inativo</Badge>;
      case "on_leave": return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Afastado</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Funcionários</h1>
          <p className="text-slate-500 mt-1">Gerencie os funcionários e seus documentos</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Funcionário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo funcionário
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={newEmployee.cpf}
                    onChange={(e) => setNewEmployee({ ...newEmployee, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={newEmployee.position}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder="Ex: Analista"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Select
                    value={newEmployee.departmentId}
                    onValueChange={(value) => setNewEmployee({ ...newEmployee, departmentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workHours">Horário de Trabalho</Label>
                <Input
                  id="workHours"
                  value={newEmployee.workHours}
                  onChange={(e) => setNewEmployee({ ...newEmployee, workHours: e.target.value })}
                  placeholder="08:00-17:00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateEmployee}
                disabled={createEmployee.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createEmployee.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="on_leave">Afastados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : employees && employees.length > 0 ? (
        <div className="grid gap-3">
          {employees.map((employee: any) => (
            <Card 
              key={employee.id} 
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/employees/${employee.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{employee.name}</h3>
                      {statusBadge(employee.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span>{employee.position || 'Sem cargo'}</span>
                      {employee.department && (
                        <>
                          <span>•</span>
                          <span>{employee.department.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">Compliance</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={employee.complianceScore || 0} className="w-20 h-2" />
                        <span className={`text-sm font-bold ${
                          (employee.complianceScore || 0) >= 80 ? 'text-emerald-600' :
                          (employee.complianceScore || 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {employee.complianceScore || 0}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <User className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nenhum funcionário encontrado</h3>
              <p className="text-slate-500 mt-1">
                {search || departmentFilter !== "all" || statusFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Comece cadastrando o primeiro funcionário"}
              </p>
              {!search && departmentFilter === "all" && statusFilter === "all" && (
                <Button 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Funcionário
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
