import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Plus, 
  Mail,
  FileText,
  Calendar,
  ExternalLink,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  Inbox,
  Newspaper,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

export default function CourtCommunications() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddEmailDialogOpen, setIsAddEmailDialogOpen] = useState(false);
  const [isAddPublicationDialogOpen, setIsAddPublicationDialogOpen] = useState(false);
  
  // Query para comunicações do tribunal
  const { data: communications, isLoading, refetch } = trpc.courtCommunications.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  
  // Query para processos (para vincular comunicações)
  const { data: lawsuits } = trpc.lawsuits.list.useQuery({});
  
  // Mutation para criar comunicação
  const createCommunication = trpc.courtCommunications.create.useMutation({
    onSuccess: () => {
      toast.success("Comunicação registrada com sucesso!");
      refetch();
      setIsAddEmailDialogOpen(false);
      setIsAddPublicationDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao registrar comunicação: ${error.message}`);
    },
  });
  
  // Mutation para marcar como lida
  const markAsRead = trpc.courtCommunications.update.useMutation({
    onSuccess: () => {
      toast.success("Comunicação marcada como lida!");
      refetch();
    },
  });
  
  const [newEmail, setNewEmail] = useState({
    lawsuitId: "",
    subject: "",
    content: "",
    senderEmail: "",
    receivedAt: new Date().toISOString().split('T')[0],
  });
  
  const [newPublication, setNewPublication] = useState({
    lawsuitId: "",
    content: "",
    source: "",
    publicationDate: new Date().toISOString().split('T')[0],
    url: "",
  });
  
  const handleCreateEmail = () => {
    if (!newEmail.lawsuitId || !newEmail.subject) {
      toast.error("Preencha o processo e o assunto");
      return;
    }
    
    createCommunication.mutate({
      lawsuitId: parseInt(newEmail.lawsuitId),
      communicationType: "email",
      subject: newEmail.subject,
      content: newEmail.content,
      senderEmail: newEmail.senderEmail,
      receivedAt: new Date(newEmail.receivedAt),
    });
  };
  
  const handleCreatePublication = () => {
    if (!newPublication.lawsuitId || !newPublication.content) {
      toast.error("Preencha o processo e o conteúdo da publicação");
      return;
    }
    
    createCommunication.mutate({
      lawsuitId: parseInt(newPublication.lawsuitId),
      communicationType: "official_diary",
      subject: `Publicação - ${newPublication.source}`,
      content: newPublication.content,
      receivedAt: new Date(newPublication.publicationDate),
    });
  };
  
  const emails = communications?.filter((c: any) => c.communication.communicationType === "email") || [];
  const publications = communications?.filter((c: any) => c.communication.communicationType === "official_diary") || [];
  const unreadCount = communications?.filter((c: any) => c.communication.status === "unread").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6 text-blue-600" />
            Comunicações do Tribunal
          </h1>
          <p className="text-muted-foreground">
            Gerencie emails e publicações dos tribunais
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddEmailDialogOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Registrar Email
          </Button>
          <Button variant="outline" onClick={() => setIsAddPublicationDialogOpen(true)}>
            <Newspaper className="mr-2 h-4 w-4" />
            Registrar Publicação
          </Button>
        </div>
      </div>
      
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Comunicações</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communications?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emails.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicações</CardTitle>
            <Newspaper className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publications.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por assunto ou conteúdo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unread">Não Lidas</SelectItem>
                <SelectItem value="read">Lidas</SelectItem>
                <SelectItem value="processed">Processadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs de Comunicações */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({communications?.length || 0})</TabsTrigger>
          <TabsTrigger value="emails">Emails ({emails.length})</TabsTrigger>
          <TabsTrigger value="publications">Publicações ({publications.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : communications && communications.length > 0 ? (
            <div className="space-y-4">
              {communications.map((comm: any) => (
                <CommunicationCard 
                  key={comm.communication.id} 
                  communication={comm} 
                  onMarkAsRead={() => markAsRead.mutate({ id: comm.communication.id, status: 'read' })}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma comunicação encontrada</h3>
                <p className="text-muted-foreground text-center mt-2">
                  Registre emails ou publicações dos tribunais para acompanhar
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="emails" className="space-y-4">
          {emails.length > 0 ? (
            <div className="space-y-4">
              {emails.map((comm: any) => (
                <CommunicationCard 
                  key={comm.communication.id} 
                  communication={comm} 
                  onMarkAsRead={() => markAsRead.mutate({ id: comm.communication.id, status: 'read' })}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhum email registrado</h3>
                <p className="text-muted-foreground text-center mt-2">
                  Registre emails recebidos dos tribunais
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="publications" className="space-y-4">
          {publications.length > 0 ? (
            <div className="space-y-4">
              {publications.map((comm: any) => (
                <CommunicationCard 
                  key={comm.communication.id} 
                  communication={comm} 
                  onMarkAsRead={() => markAsRead.mutate({ id: comm.communication.id, status: 'read' })}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma publicação registrada</h3>
                <p className="text-muted-foreground text-center mt-2">
                  Registre publicações do diário oficial
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dialog - Registrar Email */}
      <Dialog open={isAddEmailDialogOpen} onOpenChange={setIsAddEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Email do Tribunal</DialogTitle>
            <DialogDescription>
              Registre um email recebido de um tribunal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Processo *</Label>
              <Select 
                value={newEmail.lawsuitId} 
                onValueChange={(v) => setNewEmail({...newEmail, lawsuitId: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o processo" />
                </SelectTrigger>
                <SelectContent>
                  {lawsuits?.map((item) => (
                    <SelectItem key={item.lawsuit.id} value={item.lawsuit.id.toString()}>
                      {item.lawsuit.processNumber} - {item.lawsuit.claimantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Assunto *</Label>
              <Input
                value={newEmail.subject}
                onChange={(e) => setNewEmail({...newEmail, subject: e.target.value})}
                placeholder="Ex: Intimação para audiência"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email do Remetente</Label>
              <Input
                type="email"
                value={newEmail.senderEmail}
                onChange={(e) => setNewEmail({...newEmail, senderEmail: e.target.value})}
                placeholder="Ex: vara01@trt.jus.br"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Data de Recebimento</Label>
              <Input
                type="date"
                value={newEmail.receivedAt}
                onChange={(e) => setNewEmail({...newEmail, receivedAt: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                value={newEmail.content}
                onChange={(e) => setNewEmail({...newEmail, content: e.target.value})}
                placeholder="Cole o conteúdo do email aqui..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEmailDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEmail} disabled={createCommunication.isPending}>
              {createCommunication.isPending ? "Salvando..." : "Registrar Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog - Registrar Publicação */}
      <Dialog open={isAddPublicationDialogOpen} onOpenChange={setIsAddPublicationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Publicação do Diário Oficial</DialogTitle>
            <DialogDescription>
              Registre uma publicação encontrada no diário oficial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Processo *</Label>
              <Select 
                value={newPublication.lawsuitId} 
                onValueChange={(v) => setNewPublication({...newPublication, lawsuitId: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o processo" />
                </SelectTrigger>
                <SelectContent>
                  {lawsuits?.map((item) => (
                    <SelectItem key={item.lawsuit.id} value={item.lawsuit.id.toString()}>
                      {item.lawsuit.processNumber} - {item.lawsuit.claimantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select 
                value={newPublication.source} 
                onValueChange={(v) => setNewPublication({...newPublication, source: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DJE">DJE - Diário de Justiça Eletrônico</SelectItem>
                  <SelectItem value="DOU">DOU - Diário Oficial da União</SelectItem>
                  <SelectItem value="TRT">TRT - Tribunal Regional do Trabalho</SelectItem>
                  <SelectItem value="TST">TST - Tribunal Superior do Trabalho</SelectItem>
                  <SelectItem value="Escavador">Escavador</SelectItem>
                  <SelectItem value="JusBrasil">JusBrasil</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Data da Publicação</Label>
              <Input
                type="date"
                value={newPublication.publicationDate}
                onChange={(e) => setNewPublication({...newPublication, publicationDate: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>URL da Publicação</Label>
              <Input
                type="url"
                value={newPublication.url}
                onChange={(e) => setNewPublication({...newPublication, url: e.target.value})}
                placeholder="https://..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Conteúdo da Publicação *</Label>
              <Textarea
                value={newPublication.content}
                onChange={(e) => setNewPublication({...newPublication, content: e.target.value})}
                placeholder="Cole o texto da publicação aqui..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPublicationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePublication} disabled={createCommunication.isPending}>
              {createCommunication.isPending ? "Salvando..." : "Registrar Publicação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de Card de Comunicação
function CommunicationCard({ 
  communication, 
  onMarkAsRead 
}: { 
  communication: any; 
  onMarkAsRead: () => void;
}) {
  const isUnread = communication.status === "unread";
  const isEmail = communication.type === "email";
  
  return (
    <Card className={isUnread ? "border-l-4 border-l-orange-500" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${isEmail ? "bg-blue-100" : "bg-green-100"}`}>
              {isEmail ? (
                <Mail className={`h-5 w-5 ${isEmail ? "text-blue-600" : "text-green-600"}`} />
              ) : (
                <Newspaper className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                  {communication.subject}
                </h3>
                {isUnread && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                    Não lida
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Processo: {communication.lawsuit?.processNumber || "N/A"}
              </p>
              {communication.content && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {communication.content}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {communication.receivedAt 
                    ? new Date(communication.receivedAt).toLocaleDateString('pt-BR')
                    : new Date(communication.createdAt).toLocaleDateString('pt-BR')
                  }
                </span>
                {communication.senderEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {communication.senderEmail}
                  </span>
                )}
                {communication.source && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {communication.source}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {communication.url && (
              <Button variant="ghost" size="sm" asChild>
                <a href={communication.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            {isUnread && (
              <Button variant="outline" size="sm" onClick={onMarkAsRead}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Marcar como lida
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
