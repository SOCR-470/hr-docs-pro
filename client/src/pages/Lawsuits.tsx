import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Gavel, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  User,
  Building2,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Lawsuits() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLawsuit, setNewLawsuit] = useState({
    processNumber: "",
    courtName: "",
    courtRegion: "",
    courtCity: "",
    courtState: "",
    claimantName: "",
    claimantCpf: "",
    claimantLawyer: "",
    lawsuitType: "labor_claim" as const,
    claimAmount: "",
    provisionAmount: "",
    claimSummary: "",
    defenseStrategy: "",
  });

  const { data: lawsuits, isLoading, refetch } = trpc.lawsuits.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    phase: phaseFilter !== "all" ? phaseFilter : undefined,
    search: search || undefined,
  });

  const { data: lawyers } = trpc.lawyers.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();

  const createMutation = trpc.lawsuits.create.useMutation({
    onSuccess: () => {
      toast.success("Processo cadastrado com sucesso!");
      setIsCreateOpen(false);
      refetch();
      setNewLawsuit({
        processNumber: "",
        courtName: "",
        courtRegion: "",
        courtCity: "",
        courtState: "",
        claimantName: "",
        claimantCpf: "",
        claimantLawyer: "",
        lawsuitType: "labor_claim",
        claimAmount: "",
        provisionAmount: "",
        claimSummary: "",
        defenseStrategy: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar processo: ${error.message}`);
    },
  });

  const deleteMutation = trpc.lawsuits.delete.useMutation({
    onSuccess: () => {
      toast.success("Processo excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir processo: ${error.message}`);
    },
  });

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "R$ 0,00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Ativo",
      suspended: "Suspenso",
      settled: "Acordo",
      won: "Ganho",
      lost: "Perdido",
      partially_lost: "Parcialmente Perdido",
      archived: "Arquivado",
      appealed: "Em Recurso",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-blue-100 text-blue-800",
      suspended: "bg-gray-100 text-gray-800",
      settled: "bg-yellow-100 text-yellow-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800",
      partially_lost: "bg-orange-100 text-orange-800",
      archived: "bg-gray-100 text-gray-800",
      appealed: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      initial: "Inicial",
      instruction: "Instrução",
      judgment: "Julgamento",
      appeal: "Recurso",
      execution: "Execução",
      closed: "Encerrado",
    };
    return labels[phase] || phase;
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

  const handleCreate = () => {
    if (!newLawsuit.processNumber || !newLawsuit.courtName || !newLawsuit.claimantName) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createMutation.mutate(newLawsuit);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este processo?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Gavel className="h-8 w-8 text-primary" />
            Processos Trabalhistas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os processos da empresa
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Processo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Processo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="processNumber">Número do Processo *</Label>
                  <Input
                    id="processNumber"
                    placeholder="0000000-00.0000.0.00.0000"
                    value={newLawsuit.processNumber}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, processNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lawsuitType">Tipo de Ação *</Label>
                  <Select
                    value={newLawsuit.lawsuitType}
                    onValueChange={(value: any) => setNewLawsuit({ ...newLawsuit, lawsuitType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labor_claim">Reclamação Trabalhista</SelectItem>
                      <SelectItem value="work_accident">Acidente de Trabalho</SelectItem>
                      <SelectItem value="occupational_disease">Doença Ocupacional</SelectItem>
                      <SelectItem value="moral_damage">Dano Moral</SelectItem>
                      <SelectItem value="harassment">Assédio</SelectItem>
                      <SelectItem value="wrongful_termination">Rescisão Indevida</SelectItem>
                      <SelectItem value="salary_differences">Diferenças Salariais</SelectItem>
                      <SelectItem value="overtime">Horas Extras</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courtName">Vara/Tribunal *</Label>
                  <Input
                    id="courtName"
                    placeholder="1ª Vara do Trabalho"
                    value={newLawsuit.courtName}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, courtName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courtCity">Cidade</Label>
                  <Input
                    id="courtCity"
                    placeholder="São Paulo"
                    value={newLawsuit.courtCity}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, courtCity: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courtState">Estado</Label>
                  <Input
                    id="courtState"
                    placeholder="SP"
                    value={newLawsuit.courtState}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, courtState: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courtRegion">Região</Label>
                  <Input
                    id="courtRegion"
                    placeholder="2ª Região"
                    value={newLawsuit.courtRegion}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, courtRegion: e.target.value })}
                  />
                </div>
              </div>

              <hr className="my-2" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="claimantName">Nome do Reclamante *</Label>
                  <Input
                    id="claimantName"
                    placeholder="Nome completo"
                    value={newLawsuit.claimantName}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, claimantName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="claimantCpf">CPF do Reclamante</Label>
                  <Input
                    id="claimantCpf"
                    placeholder="000.000.000-00"
                    value={newLawsuit.claimantCpf}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, claimantCpf: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="claimantLawyer">Advogado do Reclamante</Label>
                <Input
                  id="claimantLawyer"
                  placeholder="Nome do advogado"
                  value={newLawsuit.claimantLawyer}
                  onChange={(e) => setNewLawsuit({ ...newLawsuit, claimantLawyer: e.target.value })}
                />
              </div>

              <hr className="my-2" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="claimAmount">Valor da Causa</Label>
                  <Input
                    id="claimAmount"
                    placeholder="0,00"
                    value={newLawsuit.claimAmount}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, claimAmount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provisionAmount">Provisão Contábil</Label>
                  <Input
                    id="provisionAmount"
                    placeholder="0,00"
                    value={newLawsuit.provisionAmount}
                    onChange={(e) => setNewLawsuit({ ...newLawsuit, provisionAmount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="claimSummary">Resumo da Reclamação</Label>
                <Textarea
                  id="claimSummary"
                  placeholder="Descreva os principais pedidos do reclamante..."
                  value={newLawsuit.claimSummary}
                  onChange={(e) => setNewLawsuit({ ...newLawsuit, claimSummary: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defenseStrategy">Estratégia de Defesa</Label>
                <Textarea
                  id="defenseStrategy"
                  placeholder="Descreva a estratégia de defesa..."
                  value={newLawsuit.defenseStrategy}
                  onChange={(e) => setNewLawsuit({ ...newLawsuit, defenseStrategy: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, reclamante..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="settled">Acordo</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
                <SelectItem value="appealed">Em Recurso</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Fases</SelectItem>
                <SelectItem value="initial">Inicial</SelectItem>
                <SelectItem value="instruction">Instrução</SelectItem>
                <SelectItem value="judgment">Julgamento</SelectItem>
                <SelectItem value="appeal">Recurso</SelectItem>
                <SelectItem value="execution">Execução</SelectItem>
                <SelectItem value="closed">Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lawsuits List */}
      {isLoading ? (
        <div className="text-center py-8">Carregando processos...</div>
      ) : lawsuits && lawsuits.length > 0 ? (
        <div className="space-y-4">
          {lawsuits.map((item) => (
            <Card key={item.lawsuit.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{item.lawsuit.processNumber}</h3>
                      <Badge className={getStatusColor(item.lawsuit.status)}>
                        {getStatusLabel(item.lawsuit.status)}
                      </Badge>
                      <Badge variant="outline">{getPhaseLabel(item.lawsuit.phase)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{item.lawsuit.claimantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{item.lawsuit.courtName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(item.lawsuit.filingDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{formatCurrency(item.lawsuit.claimAmount)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {getTypeLabel(item.lawsuit.lawsuitType)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/lawsuits/${item.lawsuit.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(item.lawsuit.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Gavel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum processo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre um novo processo para começar
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Processo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
