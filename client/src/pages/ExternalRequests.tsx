import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Mail,
  Plus,
  Link2,
  Clock,
  User,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

export default function ExternalRequests() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    employeeId: "",
    recipientEmail: "",
    recipientName: "",
    documentTypes: [] as number[],
    message: "",
    expiresInDays: "7",
  });

  const { data: requests, isLoading, refetch } = trpc.external.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: documentTypes } = trpc.documentTypes.list.useQuery();

  const createRequest = trpc.external.create.useMutation({
    onSuccess: (data) => {
      toast.success("Solicitação criada com sucesso!");
      setIsCreateDialogOpen(false);
      setNewRequest({
        employeeId: "",
        recipientEmail: "",
        recipientName: "",
        documentTypes: [],
        message: "",
        expiresInDays: "7",
      });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newRequest.employeeId || !newRequest.recipientEmail) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createRequest.mutate({
      employeeId: parseInt(newRequest.employeeId),
      recipientEmail: newRequest.recipientEmail,
      recipientName: newRequest.recipientName || undefined,
      documentTypeId: newRequest.documentTypes.length > 0 ? newRequest.documentTypes[0] : undefined,
      message: newRequest.message || undefined,
      expiresInDays: parseInt(newRequest.expiresInDays),
    });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/external/upload/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const statusConfig = {
    pending: { color: 'bg-amber-100 text-amber-700', label: 'Pendente' },
    completed: { color: 'bg-emerald-100 text-emerald-700', label: 'Concluído' },
    expired: { color: 'bg-slate-100 text-slate-700', label: 'Expirado' },
    cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelado' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitações Externas</h1>
          <p className="text-slate-500 mt-1">Envie links seguros para terceiros enviarem documentos</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((request: any) => {
            const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
            const isExpired = new Date(request.expiresAt) < new Date();
            
            return (
              <Card key={request.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-blue-50">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{request.recipientEmail}</h3>
                        <Badge className={status.color}>
                          {isExpired && request.status === 'pending' ? 'Expirado' : status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        {request.employee && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {request.employee.name}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expira: {new Date(request.expiresAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      {request.message && (
                        <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                          {request.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'pending' && !isExpired && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyLink(request.token)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copiar Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={`/external/upload/${request.token}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </>
                      )}
                      {request.status === 'completed' && (
                        <div className="flex items-center gap-1 text-emerald-600 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Recebido
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nenhuma solicitação</h3>
              <p className="text-slate-500 mt-1">
                Crie uma solicitação para enviar um link seguro a terceiros
              </p>
              <Button 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Solicitação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Solicitação Externa</DialogTitle>
            <DialogDescription>
              Envie um link seguro para terceiros enviarem documentos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Funcionário *</Label>
              <Select 
                value={newRequest.employeeId} 
                onValueChange={(v) => setNewRequest({ ...newRequest, employeeId: v })}
              >
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email do Destinatário *</Label>
                <Input
                  type="email"
                  value={newRequest.recipientEmail}
                  onChange={(e) => setNewRequest({ ...newRequest, recipientEmail: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Destinatário</Label>
                <Input
                  value={newRequest.recipientName}
                  onChange={(e) => setNewRequest({ ...newRequest, recipientName: e.target.value })}
                  placeholder="Nome (opcional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Validade do Link</Label>
              <Select 
                value={newRequest.expiresInDays} 
                onValueChange={(v) => setNewRequest({ ...newRequest, expiresInDays: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mensagem (opcional)</Label>
              <Textarea
                value={newRequest.message}
                onChange={(e) => setNewRequest({ ...newRequest, message: e.target.value })}
                placeholder="Instruções ou mensagem para o destinatário..."
                rows={3}
              />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
              <Link2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Link Seguro</p>
                <p className="text-blue-700 mt-0.5">
                  O destinatário poderá enviar documentos sem precisar de login
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createRequest.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createRequest.isPending ? "Criando..." : "Criar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
