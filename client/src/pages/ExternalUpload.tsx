import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Shield,
  Clock
} from "lucide-react";
import { toast } from "sonner";

export default function ExternalUpload({ params }: { params?: { token: string } }) {
  // Get token from URL
  const token = params?.token || window.location.pathname.split('/').pop() || '';
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: request, isLoading, error } = trpc.external.validate.useQuery(
    { token },
    { enabled: !!token }
  );

  const uploadFile = trpc.external.upload.useMutation({
    onSuccess: (data) => {
      setUploadedFiles(prev => [...prev, data.fileName]);
      toast.success("Documento enviado com sucesso!");
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadFile.mutate({
        token,
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="p-8">
            <Skeleton className="h-12 w-12 mx-auto rounded-full" />
            <Skeleton className="h-6 w-48 mx-auto mt-4" />
            <Skeleton className="h-4 w-64 mx-auto mt-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-4">Link Inválido ou Expirado</h1>
            <p className="text-slate-500 mt-2">
              Este link de upload não é mais válido. Por favor, solicite um novo link ao RH.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(request.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-4">Link Expirado</h1>
            <p className="text-slate-500 mt-2">
              Este link expirou em {new Date(request.expiresAt).toLocaleDateString('pt-BR')}.
              Por favor, solicite um novo link ao RH.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="mt-4 text-xl">HR Docs Pro</CardTitle>
          <CardDescription>Upload Seguro de Documentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Funcionário:</span> {request.employee?.name}
            </p>
            {request.message && (
              <p className="text-sm text-slate-600 mt-2">
                <span className="font-medium">Mensagem:</span> {request.message}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Válido até {new Date(request.expiresAt).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Upload Area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isUploading 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-blue-600 mt-4">Enviando documento...</p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 mt-4">
                    Clique para selecionar um arquivo
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    PDF, JPG ou PNG (máx. 10MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Documentos Enviados</p>
              {uploadedFiles.map((fileName, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg"
                >
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm text-emerald-700 flex-1 truncate">{fileName}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <Shield className="h-4 w-4 text-slate-400 mt-0.5" />
            <p>
              Seus documentos são transmitidos de forma segura e criptografada. 
              Apenas o departamento de RH terá acesso aos arquivos enviados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
