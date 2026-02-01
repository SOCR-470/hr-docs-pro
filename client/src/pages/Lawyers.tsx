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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  Phone,
  Mail,
  Building2,
  Award
} from "lucide-react";
import { toast } from "sonner";

export default function Lawyers() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLawyer, setEditingLawyer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    oabNumber: "",
    oabState: "",
    email: "",
    phone: "",
    lawFirm: "",
    specialization: "",
    isInternal: false,
    notes: "",
  });

  const { data: lawyers, isLoading, refetch } = trpc.lawyers.list.useQuery();

  const createMutation = trpc.lawyers.create.useMutation({
    onSuccess: () => {
      toast.success("Advogado cadastrado com sucesso!");
      setIsCreateOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar advogado: ${error.message}`);
    },
  });

  const updateMutation = trpc.lawyers.update.useMutation({
    onSuccess: () => {
      toast.success("Advogado atualizado com sucesso!");
      setEditingLawyer(null);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar advogado: ${error.message}`);
    },
  });

  const deleteMutation = trpc.lawyers.delete.useMutation({
    onSuccess: () => {
      toast.success("Advogado excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir advogado: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      oabNumber: "",
      oabState: "",
      email: "",
      phone: "",
      lawFirm: "",
      specialization: "",
      isInternal: false,
      notes: "",
    });
  };

  const handleEdit = (lawyer: any) => {
    setEditingLawyer(lawyer);
    setFormData({
      name: lawyer.name,
      oabNumber: lawyer.oabNumber,
      oabState: lawyer.oabState,
      email: lawyer.email || "",
      phone: lawyer.phone || "",
      lawFirm: lawyer.lawFirm || "",
      specialization: lawyer.specialization || "",
      isInternal: lawyer.isInternal,
      notes: lawyer.notes || "",
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.oabNumber || !formData.oabState) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (editingLawyer) {
      updateMutation.mutate({
        id: editingLawyer.id,
        ...formData,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        lawFirm: formData.lawFirm || undefined,
        specialization: formData.specialization || undefined,
        notes: formData.notes || undefined,
      });
    } else {
      createMutation.mutate({
        ...formData,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        lawFirm: formData.lawFirm || undefined,
        specialization: formData.specialization || undefined,
        notes: formData.notes || undefined,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este advogado?")) {
      deleteMutation.mutate({ id });
    }
  };

  const filteredLawyers = lawyers?.filter((lawyer) =>
    lawyer.name.toLowerCase().includes(search.toLowerCase()) ||
    lawyer.oabNumber.toLowerCase().includes(search.toLowerCase()) ||
    lawyer.lawFirm?.toLowerCase().includes(search.toLowerCase())
  );

  const brazilianStates = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
    "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
    "SP", "SE", "TO"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Advogados
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastro de advogados responsáveis pelos processos
          </p>
        </div>
        <Dialog open={isCreateOpen || !!editingLawyer} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingLawyer(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Advogado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingLawyer ? "Editar Advogado" : "Cadastrar Novo Advogado"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  placeholder="Dr. João da Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número OAB *</Label>
                  <Input
                    placeholder="123456"
                    value={formData.oabNumber}
                    onChange={(e) => setFormData({ ...formData, oabNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado OAB *</Label>
                  <Select
                    value={formData.oabState}
                    onValueChange={(v) => setFormData({ ...formData, oabState: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="advogado@escritorio.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Escritório</Label>
                <Input
                  placeholder="Nome do escritório"
                  value={formData.lawFirm}
                  onChange={(e) => setFormData({ ...formData, lawFirm: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Especialização</Label>
                <Input
                  placeholder="Direito Trabalhista"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isInternal"
                  checked={formData.isInternal}
                  onCheckedChange={(checked) => setFormData({ ...formData, isInternal: !!checked })}
                />
                <Label htmlFor="isInternal">Advogado Interno (da empresa)</Label>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Informações adicionais..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsCreateOpen(false);
                setEditingLawyer(null);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, OAB ou escritório..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lawyers List */}
      {isLoading ? (
        <div className="text-center py-8">Carregando advogados...</div>
      ) : filteredLawyers && filteredLawyers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLawyers.map((lawyer) => (
            <Card key={lawyer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {lawyer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold">{lawyer.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        OAB/{lawyer.oabState} {lawyer.oabNumber}
                      </p>
                    </div>
                  </div>
                  {lawyer.isInternal && (
                    <Badge variant="secondary">Interno</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  {lawyer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lawyer.email}</span>
                    </div>
                  )}
                  {lawyer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lawyer.phone}</span>
                    </div>
                  )}
                  {lawyer.lawFirm && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{lawyer.lawFirm}</span>
                    </div>
                  )}
                  {lawyer.specialization && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span>{lawyer.specialization}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(lawyer)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(lawyer.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum advogado cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre os advogados responsáveis pelos processos
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Advogado
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
