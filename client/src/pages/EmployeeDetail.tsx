import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Eye
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function EmployeeDetail({ id }: { id: number }) {
  const [, setLocation] = useLocation();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: employee, isLoading } = trpc.employees.get.useQuery({ id });
  const { data: documents, refetch: refetchDocs } = trpc.documents.byEmployee.useQuery({ employeeId: id });
  const { data: documentTypes } = trpc.documentTypes.list.useQuery();
  const { data: alerts } = trpc.alerts.list.useQuery({ employeeId: id, limit: 10 });
  const { data: recurringDocs } = trpc.recurring.list.useQuery({ employeeId: id });

  const uploadDocument = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      setSelectedDocType("");
      refetchDocs();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedDocType) {
      toast.error("Selecione um arquivo e tipo de documento");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadDocument.mutate({
        employeeId: id,
        documentTypeId: parseInt(selectedDocType),
        fileName: uploadFile.name,
        fileData: base64,
        mimeType: uploadFile.type,
        autoClassify: true,
      });
    };
    reader.readAsDataURL(uploadFile);
  };

  if (isLoading) {
    return <EmployeeDetailSkeleton />;
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Funcionário não encontrado</p>
        <Button variant="outline" onClick={() => setLocation('/employees')} className="mt-4">
          Voltar para lista
        </Button>
      </div>
    );
  }

  const complianceColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/employees')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{employee.name}</h1>
          <p className="text-slate-500">{employee.position || 'Sem cargo definido'}</p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="h-4 w-4 mr-2" />
          Enviar Documento
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <Badge className={employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                  {employee.status === 'active' ? 'Ativo' : employee.status === 'inactive' ? 'Inativo' : 'Afastado'}
                </Badge>
                <p className="text-sm text-slate-500 mt-1">CPF: {employee.cpf}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {employee.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4" />
                  {employee.phone}
                </div>
              )}
              {employee.department && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-4 w-4" />
                  {employee.department.name}
                </div>
              )}
              {employee.workHours && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4" />
                  {employee.workHours}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Score de Compliance</h3>
            <div className="text-center">
              <div className={`text-5xl font-bold ${complianceColor(employee.complianceScore || 0)}`}>
                {employee.complianceScore || 0}%
              </div>
              <Progress value={employee.complianceScore || 0} className="mt-4 h-3" />
              <p className="text-sm text-slate-500 mt-2">
                {(employee.complianceScore || 0) >= 80 ? 'Excelente conformidade' :
                 (employee.complianceScore || 0) >= 50 ? 'Atenção necessária' : 'Ação urgente requerida'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Resumo</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Documentos</span>
                <span className="font-semibold">{documents?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Alertas Abertos</span>
                <span className={`font-semibold ${(alerts?.filter((a: any) => a.status === 'open').length || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {alerts?.filter((a: any) => a.status === 'open').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Docs Recorrentes</span>
                <span className="font-semibold">{recurringDocs?.length || 0}</span>
              </div>
              {employee.admissionDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Admissão</span>
                  <span className="font-semibold">
                    {new Date(employee.admissionDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Documentos do Funcionário</CardTitle>
              <CardDescription>Documentos de admissão e pessoais</CardDescription>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc: any) => (
                    <div key={doc.document.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{doc.document.fileName}</p>
                        <p className="text-sm text-slate-500">{doc.documentType?.name || 'Documento'}</p>
                      </div>
                      <Badge className={
                        doc.document.status === 'valid' ? 'bg-emerald-100 text-emerald-700' :
                        doc.document.status === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {doc.document.status === 'valid' ? 'Válido' :
                         doc.document.status === 'expired' ? 'Vencido' : 'Pendente'}
                      </Badge>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.document.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Nenhum documento cadastrado</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Primeiro Documento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Documentos Recorrentes</CardTitle>
              <CardDescription>Folhas de ponto e holerites analisados</CardDescription>
            </CardHeader>
            <CardContent>
              {recurringDocs && recurringDocs.length > 0 ? (
                <div className="space-y-3">
                  {recurringDocs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        doc.type === 'timesheet' ? 'bg-purple-100' : 'bg-green-100'
                      }`}>
                        <FileText className={`h-5 w-5 ${
                          doc.type === 'timesheet' ? 'text-purple-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {doc.type === 'timesheet' ? 'Folha de Ponto' : 'Holerite'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(doc.referenceDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          doc.complianceStatus === 'compliant' ? 'bg-emerald-100 text-emerald-700' :
                          doc.complianceStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
                          doc.complianceStatus === 'non_compliant' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {doc.complianceScore || 0}%
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Nenhum documento recorrente</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Envie folhas de ponto ou holerites na seção "Docs Recorrentes"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Alertas de Compliance</CardTitle>
              <CardDescription>Não conformidades detectadas</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg bg-slate-50">
                      <div className={`p-2 rounded-lg ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'high' ? 'bg-orange-100' :
                        alert.severity === 'medium' ? 'bg-amber-100' : 'bg-slate-100'
                      }`}>
                        <AlertTriangle className={`h-5 w-5 ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'high' ? 'text-orange-600' :
                          alert.severity === 'medium' ? 'text-amber-600' : 'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{alert.title}</p>
                          <Badge variant="outline" className={
                            alert.severity === 'critical' ? 'border-red-200 text-red-700' :
                            alert.severity === 'high' ? 'border-orange-200 text-orange-700' :
                            alert.severity === 'medium' ? 'border-amber-200 text-amber-700' : ''
                          }>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className={
                            alert.status === 'open' ? 'border-red-200 text-red-700' :
                            alert.status === 'resolved' ? 'border-emerald-200 text-emerald-700' : ''
                          }>
                            {alert.status === 'open' ? 'Aberto' : alert.status === 'resolved' ? 'Resolvido' : alert.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{alert.description}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-emerald-300 mb-3" />
                  <p className="text-emerald-600 font-medium">Tudo em conformidade!</p>
                  <p className="text-sm text-slate-400 mt-1">Nenhum alerta para este funcionário</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>
              Selecione o tipo e o arquivo do documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes?.map((type: any) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">{uploadFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Clique para selecionar um arquivo</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG ou PNG</p>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploadDocument.isPending || !uploadFile || !selectedDocType}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadDocument.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
