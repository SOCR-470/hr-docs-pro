import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  Clock, 
  Settings, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  RefreshCw,
  Download,
  Eye
} from "lucide-react";

type TimeclockFormat = "generic" | "dimep" | "henry" | "secullum" | "topdata" | "manual";

const formatOptions: { value: TimeclockFormat; label: string; description: string }[] = [
  { value: "generic", label: "Genérico (CSV/TXT)", description: "Formato padrão com CPF, data e batidas" },
  { value: "dimep", label: "DIMEP", description: "Formato AFD Portaria 1510" },
  { value: "henry", label: "Henry", description: "Formato Henry Prisma" },
  { value: "secullum", label: "Secullum", description: "Formato Secullum Ponto" },
  { value: "topdata", label: "Topdata", description: "Formato Inner Rep" },
  { value: "manual", label: "Upload Manual", description: "Upload individual por funcionário" },
];

export default function TimeclockImport() {
  const [selectedFormat, setSelectedFormat] = useState<TimeclockFormat>("generic");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [manualUpload, setManualUpload] = useState({
    employeeId: "",
    referenceDate: "",
    file: null as File | null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: config, refetch: refetchConfig } = trpc.timeclock.config.get.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();

  // Mutations
  const previewImport = trpc.timeclock.preview.useMutation({
    onSuccess: (data) => {
      setPreviewData(data);
      setShowPreviewDialog(true);
    },
    onError: () => toast.error("Erro ao processar arquivo"),
  });

  const importRecords = trpc.timeclock.import.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      toast.success(`${data.imported} registros importados com sucesso!`);
      setSelectedFile(null);
      setPreviewData(null);
    },
    onError: () => toast.error("Erro ao importar registros"),
  });

  const uploadManual = trpc.timeclock.uploadManual.useMutation({
    onSuccess: () => {
      toast.success("Ponto enviado para análise!");
      setManualUpload({ employeeId: "", referenceDate: "", file: null });
    },
    onError: () => toast.error("Erro ao enviar ponto"),
  });

  const updateConfig = trpc.timeclock.config.update.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva!");
      refetchConfig();
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = btoa(e.target?.result as string);
      previewImport.mutate({ fileData: base64, format: selectedFormat });
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = btoa(e.target?.result as string);
      importRecords.mutate({ fileData: base64, format: selectedFormat });
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleManualUpload = async () => {
    if (!manualUpload.employeeId || !manualUpload.referenceDate || !manualUpload.file) {
      toast.error("Preencha todos os campos");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = btoa(e.target?.result as string);
      uploadManual.mutate({
        employeeId: parseInt(manualUpload.employeeId),
        referenceDate: new Date(manualUpload.referenceDate),
        fileName: manualUpload.file!.name,
        fileData: base64,
        mimeType: manualUpload.file!.type || "application/octet-stream",
      });
    };
    reader.readAsBinaryString(manualUpload.file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importação de Ponto Eletrônico</h1>
        <p className="text-slate-500">Importe registros de ponto em lote ou faça upload manual</p>
      </div>

      <Tabs defaultValue="batch" className="space-y-4">
        <TabsList>
          <TabsTrigger value="batch">
            <Upload className="w-4 h-4 mr-2" />
            Importação em Lote
          </TabsTrigger>
          <TabsTrigger value="manual">
            <User className="w-4 h-4 mr-2" />
            Upload Manual
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Batch Import Tab */}
        <TabsContent value="batch" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Format Selection */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Formato do Arquivo</CardTitle>
                <CardDescription>Selecione o sistema de ponto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {formatOptions.filter(f => f.value !== "manual").map((format) => (
                  <div
                    key={format.value}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFormat === format.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setSelectedFormat(format.value)}
                  >
                    <div className="font-medium">{format.label}</div>
                    <div className="text-sm text-slate-500">{format.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Upload do Arquivo</CardTitle>
                <CardDescription>
                  Arraste ou selecione o arquivo de ponto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.csv,.afdt,.afd"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-blue-500" />
                      <div className="font-medium">{selectedFile.name}</div>
                      <div className="text-sm text-slate-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-12 h-12 mx-auto text-slate-400" />
                      <div className="text-slate-600">
                        Clique para selecionar ou arraste o arquivo
                      </div>
                      <div className="text-sm text-slate-400">
                        Formatos: .txt, .csv, .afdt, .afd
                      </div>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePreview}
                      disabled={previewImport.isPending}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {previewImport.isPending ? "Processando..." : "Visualizar"}
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={importRecords.isPending}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importRecords.isPending ? "Importando..." : "Importar Registros"}
                    </Button>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold mb-3">Resultado da Importação</h4>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-slate-700">
                          {importResult.totalRecords}
                        </div>
                        <div className="text-sm text-slate-500">Total</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-emerald-600">
                          {importResult.imported}
                        </div>
                        <div className="text-sm text-slate-500">Importados</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {importResult.errors.length}
                        </div>
                        <div className="text-sm text-slate-500">Erros</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-amber-600">
                          {importResult.alerts}
                        </div>
                        <div className="text-sm text-slate-500">Alertas</div>
                      </div>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-red-700 mb-2">Erros:</h5>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResult.errors.map((err: any, i: number) => (
                            <div key={i} className="text-sm text-red-600">
                              Linha {err.record}: {err.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Manual Upload Tab */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Upload Manual de Ponto</CardTitle>
              <CardDescription>
                Envie a folha de ponto de um funcionário específico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Funcionário</Label>
                <Select
                  value={manualUpload.employeeId}
                  onValueChange={(v) => setManualUpload({ ...manualUpload, employeeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} - {emp.cpf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Referência</Label>
                <Input
                  type="date"
                  value={manualUpload.referenceDate}
                  onChange={(e) => setManualUpload({ ...manualUpload, referenceDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Arquivo de Ponto</Label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => manualFileInputRef.current?.click()}
                >
                  <input
                    ref={manualFileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setManualUpload({ ...manualUpload, file });
                    }}
                  />
                  {manualUpload.file ? (
                    <div className="space-y-1">
                      <FileText className="w-8 h-8 mx-auto text-blue-500" />
                      <div className="font-medium">{manualUpload.file.name}</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 mx-auto text-slate-400" />
                      <div className="text-slate-600">Clique para selecionar</div>
                      <div className="text-xs text-slate-400">PDF, imagem ou texto</div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleManualUpload}
                disabled={uploadManual.isPending}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadManual.isPending ? "Enviando..." : "Enviar para Análise"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Integração</CardTitle>
              <CardDescription>
                Configure a integração automática com seu sistema de ponto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-xl">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Integração Automática</h4>
                    <p className="text-sm text-amber-700">
                      A integração automática via API está disponível para configuração futura.
                      Por enquanto, utilize a importação em lote ou upload manual.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sistema de Ponto Padrão</Label>
                  <Select
                    value={config?.system || "generic"}
                    onValueChange={(v) => updateConfig.mutate({ system: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">Status da Integração</div>
                    <div className="text-sm text-slate-500">
                      {config?.enabled ? "Integração ativa" : "Integração desativada"}
                    </div>
                  </div>
                  <Badge variant={config?.enabled ? "default" : "secondary"}>
                    {config?.enabled ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {config?.lastSync && (
                  <div className="text-sm text-slate-500">
                    Última sincronização: {new Date(config.lastSync).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prévia da Importação</DialogTitle>
            <DialogDescription>
              Verifique os registros antes de importar
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-center">
                <div className="flex-1 p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {previewData.totalRecords}
                  </div>
                  <div className="text-sm text-blue-600">Registros Encontrados</div>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 text-left">CPF</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Batidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview?.map((record: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-mono">{record.employeeCpf}</td>
                        <td className="p-2">
                          {new Date(record.date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-2">
                          {record.punches?.map((p: any) => p.time).join(", ") || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => { setShowPreviewDialog(false); handleImport(); }}>
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
