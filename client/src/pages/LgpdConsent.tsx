import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Shield,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileSignature,
  Copy,
  Mail,
  User
} from "lucide-react";
import { toast } from "sonner";

export default function LgpdConsent() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [newSignature, setNewSignature] = useState({
    documentType: "",
    documentTitle: "",
  });

  const { data: employees, isLoading: loadingEmployees } = trpc.employees.list.useQuery();
  
  const { data: consents, isLoading: loadingConsents, refetch: refetchConsents } = 
    trpc.lgpd.byEmployee.useQuery(
      { employeeId: parseInt(selectedEmployee) },
      { enabled: !!selectedEmployee }
    );
  
  const { data: signatures, isLoading: loadingSignatures, refetch: refetchSignatures } = 
    trpc.signatures.byEmployee.useQuery(
      { employeeId: parseInt(selectedEmployee) },
      { enabled: !!selectedEmployee }
    );

  const createConsent = trpc.lgpd.create.useMutation({
    onSuccess: (data) => {
      toast.success("Solicitação de consentimento criada!");
      setIsCreateDialogOpen(false);
      refetchConsents();
      // Copiar link
      const url = `${window.location.origin}/lgpd/consent/${data.token}`;
      navigator.clipboard.writeText(url);
      toast.info("Link copiado para a área de transferência");
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const createSignature = trpc.signatures.create.useMutation({
    onSuccess: (data) => {
      toast.success("Solicitação de assinatura criada!");
      setIsSignatureDialogOpen(false);
      setNewSignature({ documentType: "", documentTitle: "" });
      refetchSignatures();
      if (data) {
        const url = `${window.location.origin}/sign/${data.token}`;
        navigator.clipboard.writeText(url);
        toast.info("Link copiado para a área de transferência");
      }
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const handleCreateConsent = () => {
    if (!selectedEmployee) {
      toast.error("Selecione um funcionário");
      return;
    }
    createConsent.mutate({ employeeId: parseInt(selectedEmployee) });
  };

  const handleCreateSignature = () => {
    if (!selectedEmployee || !newSignature.documentType || !newSignature.documentTitle) {
      toast.error("Preencha todos os campos");
      return;
    }
    createSignature.mutate({
      employeeId: parseInt(selectedEmployee),
      documentType: newSignature.documentType,
      documentTitle: newSignature.documentTitle,
    });
  };

  const copyLink = (token: string, type: "consent" | "signature") => {
    const path = type === "consent" ? "lgpd/consent" : "sign";
    const url = `${window.location.origin}/${path}/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const statusConfig = {
    pending: { color: "bg-amber-100 text-amber-700", label: "Pendente", icon: Clock },
    signed: { color: "bg-emerald-100 text-emerald-700", label: "Assinado", icon: CheckCircle },
    sent: { color: "bg-blue-100 text-blue-700", label: "Enviado", icon: Send },
    printed: { color: "bg-slate-100 text-slate-700", label: "Impresso", icon: FileSignature },
    revoked: { color: "bg-red-100 text-red-700", label: "Revogado", icon: XCircle },
    expired: { color: "bg-slate-100 text-slate-700", label: "Expirado", icon: Clock },
    cancelled: { color: "bg-red-100 text-red-700", label: "Cancelado", icon: XCircle },
  };

  const documentTypes = [
    { value: "employment_contract", label: "Contrato de Trabalho" },
    { value: "confidentiality_agreement", label: "Acordo de Confidencialidade" },
    { value: "epi_receipt", label: "Recibo de EPI" },
    { value: "overtime_agreement", label: "Acordo de Banco de Horas" },
    { value: "fine_discount_authorization", label: "Autorização Desconto Multas" },
    { value: "vacation_notice", label: "Aviso de Férias" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">LGPD e Assinaturas</h1>
          <p className="text-slate-500 mt-1">Gerencie consentimentos LGPD e assinaturas eletrônicas</p>
        </div>
      </div>

      {/* Seleção de Funcionário */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Selecione o Funcionário</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} - {emp.position || "Sem cargo"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEmployee && (
              <div className="flex gap-2 pt-6">
                <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Solicitar LGPD
                </Button>
                <Button onClick={() => setIsSignatureDialogOpen(true)}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Nova Assinatura
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consentimentos LGPD */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle>Consentimentos LGPD</CardTitle>
              </div>
              <CardDescription>
                Histórico de consentimentos do funcionário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConsents ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : consents && consents.length > 0 ? (
                <div className="space-y-3">
                  {consents.map((consent) => {
                    const status = statusConfig[consent.status as keyof typeof statusConfig];
                    const StatusIcon = status?.icon || Clock;
                    return (
                      <div 
                        key={consent.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`h-5 w-5 ${
                            consent.status === "signed" ? "text-emerald-500" :
                            consent.status === "pending" ? "text-amber-500" : "text-slate-400"
                          }`} />
                          <div>
                            <p className="font-medium text-sm">
                              Termo LGPD v{consent.termVersion}
                            </p>
                            <p className="text-xs text-slate-500">
                              {consent.signedAt 
                                ? `Assinado em ${new Date(consent.signedAt).toLocaleDateString('pt-BR')}`
                                : `Criado em ${new Date(consent.createdAt).toLocaleDateString('pt-BR')}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={status?.color || "bg-slate-100"}>
                            {status?.label || consent.status}
                          </Badge>
                          {consent.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(consent.token, "consent")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Shield className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p>Nenhum consentimento registrado</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    Solicitar consentimento LGPD
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assinaturas de Documentos */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-blue-600" />
                <CardTitle>Assinaturas de Documentos</CardTitle>
              </div>
              <CardDescription>
                Contratos e termos pendentes de assinatura
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSignatures ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : signatures && signatures.length > 0 ? (
                <div className="space-y-3">
                  {signatures.map((sig) => {
                    const status = statusConfig[sig.status as keyof typeof statusConfig];
                    const StatusIcon = status?.icon || Clock;
                    return (
                      <div 
                        key={sig.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`h-5 w-5 ${
                            sig.status === "signed" ? "text-emerald-500" :
                            sig.status === "pending" ? "text-amber-500" : "text-slate-400"
                          }`} />
                          <div>
                            <p className="font-medium text-sm">{sig.documentTitle}</p>
                            <p className="text-xs text-slate-500">
                              {sig.signedAt 
                                ? `Assinado em ${new Date(sig.signedAt).toLocaleDateString('pt-BR')}`
                                : `Criado em ${new Date(sig.createdAt).toLocaleDateString('pt-BR')}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={status?.color || "bg-slate-100"}>
                            {status?.label || sig.status}
                          </Badge>
                          {(sig.status === "pending" || sig.status === "sent") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(sig.token, "signature")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileSignature className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p>Nenhuma assinatura pendente</p>
                  <Button 
                    variant="link" 
                    className="mt-2"
                    onClick={() => setIsSignatureDialogOpen(true)}
                  >
                    Criar solicitação de assinatura
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedEmployee && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Selecione um funcionário</h3>
            <p className="text-slate-400 mt-1">
              Escolha um funcionário para gerenciar consentimentos e assinaturas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Solicitar Consentimento LGPD */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Consentimento LGPD</DialogTitle>
            <DialogDescription>
              Será gerado um link para o funcionário assinar o termo de consentimento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">O que será solicitado:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-blue-700">
                    <li>Nome completo (validação)</li>
                    <li>CPF (validação)</li>
                    <li>Data de nascimento</li>
                    <li>Código de verificação por email</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  O funcionário receberá um link válido por 30 dias. 
                  Após a assinatura, o consentimento será registrado com 
                  data/hora, IP e navegador utilizados.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateConsent} disabled={createConsent.isPending}>
              Gerar Link de Consentimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Assinatura */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Assinatura</DialogTitle>
            <DialogDescription>
              Crie um documento para assinatura eletrônica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Documento *</Label>
              <Select 
                value={newSignature.documentType} 
                onValueChange={(v) => setNewSignature({ ...newSignature, documentType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título do Documento *</Label>
              <Input
                value={newSignature.documentTitle}
                onChange={(e) => setNewSignature({ ...newSignature, documentTitle: e.target.value })}
                placeholder="Ex: Contrato de Trabalho - João Silva"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignatureDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSignature} disabled={createSignature.isPending}>
              Criar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
