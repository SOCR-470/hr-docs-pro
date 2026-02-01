import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { 
  Upload,
  FileText,
  Clock,
  Calendar,
  Eye,
  Brain,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export default function RecurringDocs() {
  const [activeTab, setActiveTab] = useState("timesheet");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: timesheets, isLoading: loadingTimesheets, refetch: refetchTimesheets } = 
    trpc.recurring.list.useQuery({ type: 'timesheet' });
  const { data: payslips, isLoading: loadingPayslips, refetch: refetchPayslips } = 
    trpc.recurring.list.useQuery({ type: 'payslip' });
  const { data: employees } = trpc.employees.list.useQuery();

  const uploadRecurring = trpc.recurring.upload.useMutation({
    onSuccess: (data) => {
      toast.success("Documento enviado e analisado com sucesso!");
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      setSelectedEmployee("");
      setReferenceDate("");
      if (activeTab === 'timesheet') {
        refetchTimesheets();
      } else {
        refetchPayslips();
      }
    },
    onError: (error) => {
      toast.error(`Erro ao processar: ${error.message}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedEmployee || !referenceDate) {
      toast.error("Preencha todos os campos");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadRecurring.mutate({
        employeeId: parseInt(selectedEmployee),
        type: activeTab as 'timesheet' | 'payslip',
        referenceDate: new Date(referenceDate),
        fileName: uploadFile.name,
        fileData: base64,
        mimeType: uploadFile.type,
      });
    };
    reader.readAsDataURL(uploadFile);
  };

  const complianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-emerald-100 text-emerald-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'non_compliant': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const renderDocList = (docs: any[], isLoading: boolean, type: string) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      );
    }

    if (!docs || docs.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">
            Nenhum {type === 'timesheet' ? 'ponto' : 'holerite'} cadastrado
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Enviar {type === 'timesheet' ? 'Folha de Ponto' : 'Holerite'}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {docs.map((doc: any) => (
          <Card key={doc.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  type === 'timesheet' ? 'bg-purple-100' : 'bg-green-100'
                }`}>
                  <FileText className={`h-6 w-6 ${
                    type === 'timesheet' ? 'text-purple-600' : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {doc.employee?.name || 'Funcionário'}
                    </p>
                    <Badge className={complianceColor(doc.complianceStatus)}>
                      {doc.complianceScore || 0}%
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {new Date(doc.referenceDate).toLocaleDateString('pt-BR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.aiAnalysis && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      <Brain className="h-3 w-3" />
                      Analisado
                    </div>
                  )}
                  {doc.aiAnalysis?.alerts?.length > 0 && (
                    <Badge variant="outline" className="border-amber-200 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {doc.aiAnalysis.alerts.length} alertas
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" asChild>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              {/* AI Analysis Summary */}
              {doc.aiAnalysis && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2">Resumo da Análise IA</p>
                  {type === 'timesheet' && doc.aiAnalysis.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 text-xs">Dias Trabalhados</p>
                        <p className="font-semibold">{doc.aiAnalysis.summary.totalDaysWorked || 0}</p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 text-xs">Atrasos</p>
                        <p className={`font-semibold ${(doc.aiAnalysis.summary.lateArrivals || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {doc.aiAnalysis.summary.lateArrivals || 0}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 text-xs">Horas Extras</p>
                        <p className={`font-semibold ${(doc.aiAnalysis.summary.unauthorizedOvertime || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {doc.aiAnalysis.summary.unauthorizedOvertime || 0}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 text-xs">Faltas</p>
                        <p className={`font-semibold ${(doc.aiAnalysis.summary.absencesWithoutJustification || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {doc.aiAnalysis.summary.absencesWithoutJustification || 0}
                        </p>
                      </div>
                    </div>
                  )}
                  {type === 'payslip' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 text-xs">Salário Bruto</p>
                        <p className="font-semibold">
                          {doc.aiAnalysis.grossSalary 
                            ? `R$ ${doc.aiAnalysis.grossSalary.toLocaleString('pt-BR')}` 
                            : '-'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 text-xs">Salário Líquido</p>
                        <p className="font-semibold">
                          {doc.aiAnalysis.netSalary 
                            ? `R$ ${doc.aiAnalysis.netSalary.toLocaleString('pt-BR')}` 
                            : '-'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded p-2">
                        <p className="text-slate-500 text-xs">Cálculo</p>
                        <p className={`font-semibold flex items-center gap-1 ${
                          doc.aiAnalysis.calculationCheck?.isCorrect ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {doc.aiAnalysis.calculationCheck?.isCorrect ? (
                            <><CheckCircle className="h-3 w-3" /> Correto</>
                          ) : (
                            <><AlertTriangle className="h-3 w-3" /> Divergente</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentos Recorrentes</h1>
          <p className="text-slate-500 mt-1">Folhas de ponto e holerites com análise de IA</p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="h-4 w-4 mr-2" />
          Enviar Documento
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="timesheet" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Folhas de Ponto
          </TabsTrigger>
          <TabsTrigger value="payslip" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Holerites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timesheet" className="mt-4">
          {renderDocList(timesheets || [], loadingTimesheets, 'timesheet')}
        </TabsContent>

        <TabsContent value="payslip" className="mt-4">
          {renderDocList(payslips || [], loadingPayslips, 'payslip')}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Enviar {activeTab === 'timesheet' ? 'Folha de Ponto' : 'Holerite'}
            </DialogTitle>
            <DialogDescription>
              O documento será processado automaticamente pela IA para análise de conformidade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
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
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
              />
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
                    <p className="text-sm text-slate-500">Clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG ou PNG</p>
                  </>
                )}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
              <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Análise Automática</p>
                <p className="text-blue-700 mt-0.5">
                  A IA irá extrair dados e verificar conformidade automaticamente
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploadRecurring.isPending || !uploadFile || !selectedEmployee || !referenceDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploadRecurring.isPending ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-pulse" />
                  Analisando...
                </>
              ) : (
                "Enviar e Analisar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
