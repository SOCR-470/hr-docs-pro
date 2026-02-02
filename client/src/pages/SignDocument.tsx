import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  FileSignature, 
  CheckCircle2, 
  XCircle,
  Shield,
  AlertTriangle,
  Loader2,
  Pen,
  Type,
  Upload,
  Eraser
} from "lucide-react";

interface SignDocumentProps {
  token: string;
}

export default function SignDocument({ token }: SignDocumentProps) {
  const [step, setStep] = useState<"verify" | "view" | "sign" | "success" | "error">("verify");
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<"drawn" | "typed" | "uploaded">("drawn");
  const [signatureImage, setSignatureImage] = useState("");
  const [typedSignature, setTypedSignature] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  // Verification form
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  // Canvas ref for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Queries
  const { data: documentData, isLoading, error } = trpc.generatedDocuments.getByToken.useQuery(
    { token },
    { retry: false }
  );
  
  // Handle query error
  useEffect(() => {
    if (error) {
      setErrorMessage(error.message);
      setStep("error");
    }
  }, [error]);
  
  // Mutations
  const verifyIdentity = trpc.generatedDocuments.verifyIdentity.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setIsVerified(true);
        setStep("view");
        toast.success("Identidade verificada com sucesso!");
      } else {
        toast.error(result.error || "Falha na verificação");
      }
    },
    onError: (error) => {
      toast.error(`Erro na verificação: ${error.message}`);
    },
  });
  
  const signDocument = trpc.generatedDocuments.sign.useMutation({
    onSuccess: (result) => {
      if (result.certificateUrl) {
        setCertificateUrl(result.certificateUrl);
      }
      setStep("success");
      toast.success("Documento assinado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao assinar: ${error.message}`);
    },
  });
  
  // Canvas drawing functions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 150;
    
    // Set drawing style
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Fill with white background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [step]);
  
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };
  
  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureImage(dataUrl);
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureImage("");
  };
  
  const handleVerify = () => {
    if (!cpf || !birthDate) {
      toast.error("Preencha CPF e data de nascimento");
      return;
    }
    
    verifyIdentity.mutate({
      token,
      cpf,
      birthDate,
      code: verificationCode,
    });
  };
  
  const handleSign = () => {
    if (!agreedTerms) {
      toast.error("Você precisa concordar com os termos");
      return;
    }
    
    let finalSignature = "";
    if (signatureType === "drawn") {
      if (!signatureImage) {
        toast.error("Por favor, desenhe sua assinatura");
        return;
      }
      finalSignature = signatureImage;
    } else if (signatureType === "typed") {
      if (!typedSignature) {
        toast.error("Por favor, digite sua assinatura");
        return;
      }
      // Create image from typed text
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000";
        ctx.font = "italic 32px 'Dancing Script', cursive, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
        finalSignature = canvas.toDataURL("image/png");
      }
    }
    
    signDocument.mutate({
      token,
      signedName: documentData?.employee?.name || "",
      signedCpf: cpf,
      signedBirthDate: birthDate,
      signatureImage: finalSignature,
      signatureType,
    });
  };
  
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando documento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (step === "error" || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Documento não encontrado</h2>
            <p className="text-muted-foreground text-center">
              {errorMessage || "O link pode ter expirado ou o documento já foi assinado."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Documento Assinado!</h2>
            <p className="text-muted-foreground text-center mb-4">
              Sua assinatura foi registrada com sucesso. Você receberá uma cópia por email.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 mb-4">
              <Shield className="h-4 w-4 inline mr-2" />
              Assinatura digital válida conforme MP 2.200-2/2001
            </div>
            
            {certificateUrl && (
              <div className="w-full space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Certificado de Assinatura
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Um certificado com todos os dados da assinatura foi gerado para garantir a validade jurídica do documento.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => window.open(certificateUrl, '_blank')}
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Visualizar Certificado
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  O certificado contém: hash SHA-256 do documento, dados do signatário, IP, data/hora e fundamentação legal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <FileSignature className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Assinatura Digital de Documento</h1>
          <p className="text-muted-foreground">
            {documentData?.model?.name}
          </p>
        </div>
        
        {/* Verification Step */}
        {step === "verify" && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Verificação de Identidade</CardTitle>
              <CardDescription>
                Para sua segurança, confirme seus dados antes de visualizar o documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input 
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input 
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Seus dados serão verificados com o cadastro do funcionário
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleVerify}
                disabled={verifyIdentity.isPending}
              >
                {verifyIdentity.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar e Continuar"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* View Document Step */}
        {step === "view" && documentData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documento para Assinatura</CardTitle>
                <CardDescription>
                  Leia atentamente o documento antes de assinar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-6 bg-white prose max-w-none max-h-[500px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: documentData.document.generatedContent }}
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button onClick={() => setStep("sign")}>
                Continuar para Assinatura
              </Button>
            </div>
          </div>
        )}
        
        {/* Sign Step */}
        {step === "sign" && documentData && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Assinar Documento</CardTitle>
              <CardDescription>
                Escolha como deseja assinar o documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="drawn">
                    <Pen className="h-4 w-4 mr-2" />
                    Desenhar
                  </TabsTrigger>
                  <TabsTrigger value="typed">
                    <Type className="h-4 w-4 mr-2" />
                    Digitar
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="drawn" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-muted-foreground mb-2">
                      Desenhe sua assinatura no campo abaixo:
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
                      <canvas
                        ref={canvasRef}
                        className="w-full cursor-crosshair"
                        style={{ touchAction: "none" }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={clearCanvas}
                    >
                      <Eraser className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="typed" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Digite seu nome completo</Label>
                    <Input 
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder={documentData.employee?.name || "Seu nome"}
                      className="text-xl"
                    />
                  </div>
                  {typedSignature && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                      <p 
                        className="text-3xl text-center py-4"
                        style={{ fontFamily: "'Dancing Script', cursive, serif", fontStyle: "italic" }}
                      >
                        {typedSignature}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="border-t pt-4">
                <div className="flex items-start gap-2">
                  <Checkbox 
                    id="terms" 
                    checked={agreedTerms}
                    onCheckedChange={(v) => setAgreedTerms(v as boolean)}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    Declaro que li e concordo com o conteúdo do documento acima. 
                    Reconheço que esta assinatura digital tem validade jurídica 
                    conforme a Medida Provisória 2.200-2/2001 e o Marco Civil da Internet.
                  </label>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStep("view")}
                >
                  Voltar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSign}
                  disabled={signDocument.isPending || !agreedTerms}
                >
                  {signDocument.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assinando...
                    </>
                  ) : (
                    <>
                      <FileSignature className="h-4 w-4 mr-2" />
                      Assinar Documento
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
