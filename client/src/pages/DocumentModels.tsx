import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  FileSignature,
  Shield,
  Gift,
  Lock,
  LogOut,
  MoreHorizontal,
  Wand2,
  Building2
} from "lucide-react";

const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
  admission: { label: "Admissão", icon: FileText, color: "bg-blue-100 text-blue-800" },
  safety: { label: "Segurança", icon: Shield, color: "bg-orange-100 text-orange-800" },
  benefits: { label: "Benefícios", icon: Gift, color: "bg-green-100 text-green-800" },
  confidentiality: { label: "Confidencialidade", icon: Lock, color: "bg-purple-100 text-purple-800" },
  termination: { label: "Rescisão", icon: LogOut, color: "bg-red-100 text-red-800" },
  other: { label: "Outros", icon: MoreHorizontal, color: "bg-gray-100 text-gray-800" },
};

export default function DocumentModels() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "other" as const,
    content: "",
    requiresSignature: true,
    requiresWitness: false,
    witnessCount: 0,
  });

  // Company settings form
  const [companyData, setCompanyData] = useState({
    companyName: "",
    tradeName: "",
    cnpj: "",
    stateRegistration: "",
    municipalRegistration: "",
    address: "",
    addressNumber: "",
    addressComplement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    legalRepName: "",
    legalRepCpf: "",
    legalRepPosition: "",
  });

  // Queries
  const { data: models, refetch: refetchModels } = trpc.documentModels.list.useQuery();
  const { data: variables } = trpc.documentModels.variables.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: companySettings, refetch: refetchCompany } = trpc.companySettings.get.useQuery();

  // Mutations
  const createModel = trpc.documentModels.create.useMutation({
    onSuccess: () => {
      toast.success("Modelo criado com sucesso");
      setIsCreateOpen(false);
      refetchModels();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    },
  });

  const updateModel = trpc.documentModels.update.useMutation({
    onSuccess: () => {
      toast.success("Modelo atualizado com sucesso");
      setIsEditOpen(false);
      refetchModels();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar modelo: ${error.message}`);
    },
  });

  const deleteModel = trpc.documentModels.delete.useMutation({
    onSuccess: () => {
      toast.success("Modelo excluído com sucesso");
      refetchModels();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir modelo: ${error.message}`);
    },
  });

  const createDefaults = trpc.documentModels.createDefaults.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.created} modelos padrão criados`);
      refetchModels();
    },
    onError: (error) => {
      toast.error(`Erro ao criar modelos padrão: ${error.message}`);
    },
  });

  const upsertCompany = trpc.companySettings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Dados da empresa salvos com sucesso");
      setIsCompanyOpen(false);
      refetchCompany();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar dados da empresa: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "other",
      content: "",
      requiresSignature: true,
      requiresWitness: false,
      witnessCount: 0,
    });
  };

  const handleCreate = () => {
    createModel.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedModel) return;
    updateModel.mutate({ id: selectedModel.id, ...formData });
  };

  const handleEdit = (model: any) => {
    setSelectedModel(model);
    setFormData({
      name: model.name,
      description: model.description || "",
      category: model.category,
      content: model.content,
      requiresSignature: model.requiresSignature,
      requiresWitness: model.requiresWitness,
      witnessCount: model.witnessCount || 0,
    });
    setIsEditOpen(true);
  };

  const handlePreview = async (model: any) => {
    if (!selectedEmployeeId) {
      toast.error("Selecione um funcionário para visualizar o documento preenchido");
      return;
    }
    
    try {
      // Use the preview query with proper tRPC client
      const utils = trpc.useUtils();
      const result = await utils.documentModels.preview.fetch({ 
        modelId: model.id, 
        employeeId: selectedEmployeeId 
      });
      setPreviewContent(result.content);
      setSelectedModel(model);
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast.error(`Erro ao gerar preview: ${error.message}`);
    }
  };

  const handleOpenCompany = () => {
    if (companySettings) {
      setCompanyData({
        companyName: companySettings.companyName || "",
        tradeName: companySettings.tradeName || "",
        cnpj: companySettings.cnpj || "",
        stateRegistration: companySettings.stateRegistration || "",
        municipalRegistration: companySettings.municipalRegistration || "",
        address: companySettings.address || "",
        addressNumber: companySettings.addressNumber || "",
        addressComplement: companySettings.addressComplement || "",
        neighborhood: companySettings.neighborhood || "",
        city: companySettings.city || "",
        state: companySettings.state || "",
        zipCode: companySettings.zipCode || "",
        phone: companySettings.phone || "",
        email: companySettings.email || "",
        website: companySettings.website || "",
        legalRepName: companySettings.legalRepName || "",
        legalRepCpf: companySettings.legalRepCpf || "",
        legalRepPosition: companySettings.legalRepPosition || "",
      });
    }
    setIsCompanyOpen(true);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + variable
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Modelos de Documentos</h1>
            <p className="text-muted-foreground">
              Crie e gerencie modelos de contratos, termos e outros documentos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenCompany}>
              <Building2 className="h-4 w-4 mr-2" />
              Dados da Empresa
            </Button>
            <Button variant="outline" onClick={() => createDefaults.mutate()}>
              <Wand2 className="h-4 w-4 mr-2" />
              Criar Modelos Padrão
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Modelo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Novo Modelo</DialogTitle>
                  <DialogDescription>
                    Crie um modelo de documento com variáveis que serão preenchidas automaticamente
                  </DialogDescription>
                </DialogHeader>
                <ModelForm 
                  formData={formData}
                  setFormData={setFormData}
                  variables={variables}
                  insertVariable={insertVariable}
                  onSubmit={handleCreate}
                  isLoading={createModel.isPending}
                  submitLabel="Criar Modelo"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Employee selector for preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecione um funcionário para visualizar documentos preenchidos</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedEmployeeId?.toString() || ""} 
              onValueChange={(v) => setSelectedEmployeeId(Number(v))}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} - {emp.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Models Grid */}
        {!models || models.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum modelo cadastrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crie modelos de documentos para gerar contratos, termos e outros documentos automaticamente.
              </p>
              <Button onClick={() => createDefaults.mutate()}>
                <Wand2 className="h-4 w-4 mr-2" />
                Criar Modelos Padrão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => {
              const category = categoryLabels[model.category] || categoryLabels.other;
              const CategoryIcon = category.icon;
              
              return (
                <Card key={model.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${category.color}`}>
                          <CategoryIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{model.name}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {category.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {model.description || "Sem descrição"}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      {model.requiresSignature && (
                        <Badge variant="secondary">
                          <FileSignature className="h-3 w-3 mr-1" />
                          Assinatura
                        </Badge>
                      )}
                      {model.requiresWitness && (
                        <Badge variant="secondary">
                          {model.witnessCount} testemunha(s)
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handlePreview(model)}
                        disabled={!selectedEmployeeId}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(model)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteModel.mutate({ id: model.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Modelo</DialogTitle>
              <DialogDescription>
                Edite o modelo de documento
              </DialogDescription>
            </DialogHeader>
            <ModelForm 
              formData={formData}
              setFormData={setFormData}
              variables={variables}
              insertVariable={insertVariable}
              onSubmit={handleUpdate}
              isLoading={updateModel.isPending}
              submitLabel="Salvar Alterações"
            />
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualização do Documento</DialogTitle>
              <DialogDescription>
                {selectedModel?.name} - Preenchido com dados do funcionário selecionado
              </DialogDescription>
            </DialogHeader>
            <div 
              className="border rounded-lg p-6 bg-white"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </DialogContent>
        </Dialog>

        {/* Company Settings Dialog */}
        <Dialog open={isCompanyOpen} onOpenChange={setIsCompanyOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dados da Empresa</DialogTitle>
              <DialogDescription>
                Configure os dados da empresa que serão usados nos documentos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social *</Label>
                  <Input 
                    value={companyData.companyName}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Empresa Ltda"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input 
                    value={companyData.tradeName}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, tradeName: e.target.value }))}
                    placeholder="Nome Fantasia"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input 
                    value={companyData.cnpj}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input 
                    value={companyData.stateRegistration}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, stateRegistration: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Municipal</Label>
                  <Input 
                    value={companyData.municipalRegistration}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, municipalRegistration: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Endereço</Label>
                  <Input 
                    value={companyData.address}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua, Avenida..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input 
                    value={companyData.addressNumber}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, addressNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input 
                    value={companyData.addressComplement}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, addressComplement: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input 
                    value={companyData.neighborhood}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input 
                    value={companyData.city}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input 
                    value={companyData.state}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, state: e.target.value }))}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input 
                    value={companyData.zipCode}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="00000-000"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input 
                    value={companyData.phone}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input 
                    value={companyData.website}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Representante Legal</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input 
                      value={companyData.legalRepName}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, legalRepName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input 
                      value={companyData.legalRepCpf}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, legalRepCpf: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input 
                      value={companyData.legalRepPosition}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, legalRepPosition: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCompanyOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => upsertCompany.mutate(companyData)}
                  disabled={upsertCompany.isPending || !companyData.companyName || !companyData.cnpj}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Model Form Component
function ModelForm({ 
  formData, 
  setFormData, 
  variables, 
  insertVariable, 
  onSubmit, 
  isLoading, 
  submitLabel 
}: {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  variables: any;
  insertVariable: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="content">Conteúdo</TabsTrigger>
        <TabsTrigger value="variables">Variáveis</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>
      
      <TabsContent value="content" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Modelo *</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Contrato de Trabalho"
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => setFormData((prev: any) => ({ ...prev, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admission">Admissão</SelectItem>
                <SelectItem value="safety">Segurança</SelectItem>
                <SelectItem value="benefits">Benefícios</SelectItem>
                <SelectItem value="confidentiality">Confidencialidade</SelectItem>
                <SelectItem value="termination">Rescisão</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input 
            value={formData.description}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            placeholder="Breve descrição do modelo"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Conteúdo do Documento (HTML) *</Label>
          <Textarea 
            value={formData.content}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, content: e.target.value }))}
            placeholder="<div>Conteúdo do documento com {{variáveis}}</div>"
            className="min-h-[300px] font-mono text-sm"
          />
        </div>
      </TabsContent>
      
      <TabsContent value="variables" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Clique em uma variável para inseri-la no conteúdo do documento
        </p>
        
        {variables && Object.entries(variables).map(([group, vars]: [string, any]) => (
          <div key={group} className="space-y-2">
            <h4 className="font-medium capitalize">
              {group === 'employee' ? 'Funcionário' : 
               group === 'company' ? 'Empresa' : 
               group === 'dates' ? 'Datas' : 'Outros'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(vars).map(([variable, description]: [string, any]) => (
                <Button
                  key={variable}
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(variable)}
                  title={description}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {variable}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </TabsContent>
      
      <TabsContent value="settings" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Requer Assinatura</Label>
            <p className="text-sm text-muted-foreground">
              O documento precisará ser assinado pelo funcionário
            </p>
          </div>
          <Switch 
            checked={formData.requiresSignature}
            onCheckedChange={(v) => setFormData((prev: any) => ({ ...prev, requiresSignature: v }))}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label>Requer Testemunhas</Label>
            <p className="text-sm text-muted-foreground">
              O documento precisará de testemunhas
            </p>
          </div>
          <Switch 
            checked={formData.requiresWitness}
            onCheckedChange={(v) => setFormData((prev: any) => ({ ...prev, requiresWitness: v }))}
          />
        </div>
        
        {formData.requiresWitness && (
          <div className="space-y-2">
            <Label>Número de Testemunhas</Label>
            <Input 
              type="number"
              min={1}
              max={4}
              value={formData.witnessCount}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, witnessCount: parseInt(e.target.value) || 0 }))}
            />
          </div>
        )}
      </TabsContent>
      
      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button 
          onClick={onSubmit}
          disabled={isLoading || !formData.name || !formData.content}
        >
          {submitLabel}
        </Button>
      </div>
    </Tabs>
  );
}
