import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Send, 
  FileSignature, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  Mail,
  User,
  FileText,
  RefreshCw
} from "lucide-react";

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-800", icon: FileText },
  pending_signature: { label: "Aguardando Assinatura", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-800", icon: Mail },
  signed: { label: "Assinado", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

export default function SendDocuments() {
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState("");
  
  // Form state
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [expirationDays, setExpirationDays] = useState("7");

  // Queries
  const { data: generatedDocs, refetch: refetchDocs } = trpc.generatedDocuments.list.useQuery();
  const { data: models } = trpc.documentModels.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();

  // Mutations
  const generateDoc = trpc.generatedDocuments.generate.useMutation({
    onSuccess: () => {
      toast.success("Documento gerado com sucesso");
      setIsGenerateOpen(false);
      refetchDocs();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar documento: ${error.message}`);
    },
  });

  const sendDoc = trpc.generatedDocuments.send.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado para assinatura");
      refetchDocs();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar documento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedModel("");
    setSelectedEmployee("");
    setExpirationDays("7");
  };

  const handleGenerate = () => {
    if (!selectedModel || !selectedEmployee) {
      toast.error("Selecione o modelo e o funcionário");
      return;
    }
    
    generateDoc.mutate({
      modelId: parseInt(selectedModel),
      employeeId: parseInt(selectedEmployee),
      expirationDays: parseInt(expirationDays),
    });
  };

  const handlePreview = (doc: any) => {
    setSelectedDoc(doc);
    setPreviewContent(doc.document.generatedContent || "");
    setIsPreviewOpen(true);
  };

  const handleSend = (docId: number) => {
    sendDoc.mutate({ documentId: docId });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Envio de Documentos</h1>
            <p className="text-muted-foreground">
              Gere documentos a partir de modelos e envie para assinatura dos funcionários
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchDocs()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Gerar Documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar Documento para Assinatura</DialogTitle>
                  <DialogDescription>
                    Selecione o modelo e o funcionário para gerar o documento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Modelo de Documento *</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {models?.map((model) => (
                          <SelectItem key={model.id} value={model.id.toString()}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Funcionário *</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
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
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Validade do Link (dias)</Label>
                    <Input 
                      type="number"
                      min={1}
                      max={30}
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      O funcionário terá esse prazo para assinar o documento
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleGenerate}
                      disabled={generateDoc.isPending || !selectedModel || !selectedEmployee}
                    >
                      Gerar Documento
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Documents List */}
        {!generatedDocs || generatedDocs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum documento gerado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Gere documentos a partir de modelos para enviar aos funcionários para assinatura.
              </p>
              <Button onClick={() => setIsGenerateOpen(true)}>
                <FileSignature className="h-4 w-4 mr-2" />
                Gerar Primeiro Documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {generatedDocs.map((doc) => {
              const status = statusLabels[doc.document.status] || statusLabels.draft;
              const StatusIcon = status.icon;
              
              return (
                <Card key={doc.document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${status.color}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{doc.model?.name || "Modelo não encontrado"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{doc.employee?.name || "Funcionário não encontrado"}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">Criado em</div>
                          <div>{formatDate(doc.document.createdAt)}</div>
                        </div>
                        
                        {doc.document.expiresAt && (
                          <div className="text-right text-sm">
                            <div className="text-muted-foreground">Expira em</div>
                            <div>{formatDate(doc.document.expiresAt)}</div>
                          </div>
                        )}
                        
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {(doc.document.status === 'draft' || doc.document.status === 'pending_signature') && (
                            <Button 
                              size="sm"
                              onClick={() => handleSend(doc.document.id)}
                              disabled={sendDoc.isPending}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Enviar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {doc.document.status === 'signed' && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Assinado por:</span>{" "}
                            <span className="font-medium">{doc.document.signedName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Em:</span>{" "}
                            <span>{formatDate(doc.document.signedAt)}</span>
                          </div>
                          {doc.document.pdfKey && (
                            <Button variant="link" size="sm" asChild>
                              <a href={doc.document.pdfKey} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 mr-1" />
                                Baixar PDF Assinado
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualização do Documento</DialogTitle>
              <DialogDescription>
                {selectedDoc?.model?.name} - {selectedDoc?.employee?.name}
              </DialogDescription>
            </DialogHeader>
            <div 
              className="border rounded-lg p-6 bg-white prose max-w-none"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
