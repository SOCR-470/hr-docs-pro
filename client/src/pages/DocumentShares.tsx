import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Share2,
  Plus,
  Link2,
  Copy,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Mail,
  Clock,
  Eye,
  FileText,
  Shield,
  User
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentShares() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [newShare, setNewShare] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientType: "accountant" as "accountant" | "lawyer" | "partner" | "other",
    message: "",
    validityDays: "7",
  });

  const { data: shares, isLoading, refetch } = trpc.shares.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  
  const { data: employeeDocuments, isLoading: loadingDocs } = trpc.shares.getDocumentsForShare.useQuery(
    { employeeId: parseInt(selectedEmployee) },
    { enabled: !!selectedEmployee }
  );
  
  const { data: lgpdCheck } = trpc.shares.checkLgpdConsent.useQuery(
    { employeeId: parseInt(selectedEmployee) },
    { enabled: !!selectedEmployee }
  );

  const createShare = trpc.shares.create.useMutation({
    onSuccess: (data) => {
      toast.success("Compartilhamento criado com sucesso!");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const revokeShare = trpc.shares.revoke.useMutation({
    onSuccess: () => {
      toast.success("Compartilhamento revogado!");
      refetch();
    },
  });

  const resetForm = () => {
    setSelectedEmployee("");
    setSelectedDocuments([]);
    setNewShare({
      recipientName: "",
      recipientEmail: "",
      recipientType: "accountant",
      message: "",
      validityDays: "7",
    });
  };

  const handleCreate = () => {
    if (!selectedEmployee || selectedDocuments.length === 0) {
      toast.error("Selecione um funcionário e pelo menos um documento");
      return;
    }
    if (!newShare.recipientName || !newShare.recipientEmail) {
      toast.error("Preencha os dados do destinatário");
      return;
    }
    if (!lgpdCheck?.hasConsent) {
      toast.error("Funcionário não possui consentimento LGPD válido");
      return;
    }
    
    createShare.mutate({
      employeeId: parseInt(selectedEmployee),
      documentIds: selectedDocuments,
      recipientName: newShare.recipientName,
      recipientEmail: newShare.recipientEmail,
      recipientType: newShare.recipientType,
      message: newShare.message || undefined,
      validityDays: parseInt(newShare.validityDays),
    });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const toggleDocument = (docId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const recipientTypeLabels = {
    accountant: "Contador",
    lawyer: "Advogado",
    partner: "Parceiro",
    other: "Outro",
  };

  const statusConfig = {
    active: { color: "bg-emerald-100 text-emerald-700", label: "Ativo" },
    expired: { color: "bg-slate-100 text-slate-700", label: "Expirado" },
    revoked: { color: "bg-red-100 text-red-700", label: "Revogado" },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compartilhamento de Documentos</h1>
          <p className="text-slate-500 mt-1">Compartilhe documentos com terceiros de forma segura</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Compartilhamento
        </Button>
      </div>

      {/* Lista de Compartilhamentos */}
      <div className="space-y-4">
        {shares?.map(({ share, employee }) => (
          <Card key={share.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Share2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{employee.name}</h3>
                      <Badge className={statusConfig[share.status as keyof typeof statusConfig]?.color || "bg-slate-100"}>
                        {statusConfig[share.status as keyof typeof statusConfig]?.label || share.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {share.recipientName} ({share.recipientEmail})
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {recipientTypeLabels[share.recipientType as keyof typeof recipientTypeLabels]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {(share.documentIds as number[]).length} documentos
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {share.accessCount || 0} acessos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expira: {share.expiresAt ? new Date(share.expiresAt).toLocaleDateString('pt-BR') : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(share.token)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar Link
                  </Button>
                  {share.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => revokeShare.mutate({ id: share.id })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Revogar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!shares || shares.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Share2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">Nenhum compartilhamento ativo</h3>
              <p className="text-slate-400 mt-1">
                Crie um novo compartilhamento para enviar documentos a terceiros
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Criar Compartilhamento */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Compartilhamento de Documentos</DialogTitle>
            <DialogDescription>
              Selecione os documentos e defina o destinatário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Seleção de Funcionário */}
            <div>
              <Label>Funcionário *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Verificação LGPD */}
            {selectedEmployee && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                lgpdCheck?.hasConsent ? "bg-emerald-50" : "bg-amber-50"
              }`}>
                {lgpdCheck?.hasConsent ? (
                  <>
                    <Shield className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-emerald-700">
                      Funcionário possui consentimento LGPD válido
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm text-amber-700">
                      Funcionário não possui consentimento LGPD. Solicite antes de compartilhar.
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Seleção de Documentos */}
            {selectedEmployee && lgpdCheck?.hasConsent && (
              <div>
                <Label className="mb-2 block">Documentos para Compartilhar *</Label>
                {loadingDocs ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {employeeDocuments?.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-slate-50"
                      >
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={() => toggleDocument(doc.id)}
                        />
                        <FileText className="h-4 w-4 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.fileName}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                    {(!employeeDocuments || employeeDocuments.length === 0) && (
                      <p className="p-4 text-center text-slate-500 text-sm">
                        Nenhum documento disponível
                      </p>
                    )}
                  </div>
                )}
                {selectedDocuments.length > 0 && (
                  <p className="text-sm text-blue-600 mt-2">
                    {selectedDocuments.length} documento(s) selecionado(s)
                  </p>
                )}
              </div>
            )}

            {/* Dados do Destinatário */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Destinatário *</Label>
                <Input
                  value={newShare.recipientName}
                  onChange={(e) => setNewShare({ ...newShare, recipientName: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>Email do Destinatário *</Label>
                <Input
                  type="email"
                  value={newShare.recipientEmail}
                  onChange={(e) => setNewShare({ ...newShare, recipientEmail: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Destinatário</Label>
                <Select 
                  value={newShare.recipientType} 
                  onValueChange={(v: "accountant" | "lawyer" | "partner" | "other") => 
                    setNewShare({ ...newShare, recipientType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accountant">Contador</SelectItem>
                    <SelectItem value="lawyer">Advogado</SelectItem>
                    <SelectItem value="partner">Parceiro</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Select 
                  value={newShare.validityDays} 
                  onValueChange={(v) => setNewShare({ ...newShare, validityDays: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="3">3 dias</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Mensagem (opcional)</Label>
              <Textarea
                value={newShare.message}
                onChange={(e) => setNewShare({ ...newShare, message: e.target.value })}
                placeholder="Mensagem para o destinatário..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createShare.isPending || !lgpdCheck?.hasConsent}
            >
              Criar Compartilhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
