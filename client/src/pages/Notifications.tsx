import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Bell, 
  BellOff,
  Check,
  CheckCheck,
  Mail,
  Calendar,
  AlertTriangle,
  FileText,
  Palmtree,
  Gavel,
  ClipboardList,
  Settings,
  Send,
  Clock
} from "lucide-react";

const typeIcons: Record<string, any> = {
  document_expiring: FileText,
  vacation_expiring: Palmtree,
  new_alert: AlertTriangle,
  checklist_pending: ClipboardList,
  signature_required: FileText,
  lawsuit_update: Gavel,
  system: Bell,
};

const typeLabels: Record<string, string> = {
  document_expiring: "Documento Vencendo",
  vacation_expiring: "Férias Vencendo",
  new_alert: "Novo Alerta",
  checklist_pending: "Checklist Pendente",
  signature_required: "Assinatura Necessária",
  lawsuit_update: "Atualização Processo",
  system: "Sistema",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-yellow-100 text-yellow-800",
  urgent: "bg-red-100 text-red-800",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("all");
  
  const utils = trpc.useUtils();
  
  // Queries
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({ limit: 100 });
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();
  const { data: preferences } = trpc.notifications.preferences.useQuery();
  
  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("Todas as notificações marcadas como lidas");
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });
  
  const updatePreferencesMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Preferências atualizadas");
      utils.notifications.preferences.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const sendDailyDigestMutation = trpc.notifications.sendDailyDigest.useMutation({
    onSuccess: () => {
      toast.success("Resumo diário enviado para seu email");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const sendWeeklyDigestMutation = trpc.notifications.sendWeeklyDigest.useMutation({
    onSuccess: () => {
      toast.success("Resumo semanal enviado para seu email");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const handlePreferenceChange = (key: string, value: boolean | string | number) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };
  
  const unreadNotifications = notifications?.filter((n: any) => !n.readAt);
  const readNotifications = notifications?.filter((n: any) => n.readAt);
  
  const displayNotifications = activeTab === 'unread' 
    ? unreadNotifications 
    : activeTab === 'read' 
      ? readNotifications 
      : notifications;
  
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return d.toLocaleDateString('pt-BR');
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Notificações</h1>
            <p className="text-slate-400 mt-1">Central de notificações e preferências de alertas</p>
          </div>
          <div className="flex gap-2">
            {typeof unreadCount === 'number' && unreadCount > 0 && (
              <Button 
                variant="outline" 
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Não Lidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{unreadCount || 0}</div>
              <p className="text-xs text-slate-500">notificações pendentes</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-300">{notifications?.length || 0}</div>
              <p className="text-xs text-slate-500">notificações recentes</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Resumos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendDailyDigestMutation.mutate()}
                  disabled={sendDailyDigestMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Diário
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendWeeklyDigestMutation.mutate()}
                  disabled={sendWeeklyDigestMutation.isPending}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Semanal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Não Lidas
              {typeof unreadCount === 'number' && unreadCount > 0 && (
                <Badge className="bg-blue-500 text-white ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read" className="flex items-center gap-2">
              <BellOff className="h-4 w-4" />
              Lidas
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferências
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <NotificationList 
              notifications={displayNotifications} 
              isLoading={isLoading}
              onMarkAsRead={(id) => markAsReadMutation.mutate({ id })}
              formatDate={formatDate}
            />
          </TabsContent>
          
          <TabsContent value="unread" className="mt-4">
            <NotificationList 
              notifications={displayNotifications} 
              isLoading={isLoading}
              onMarkAsRead={(id) => markAsReadMutation.mutate({ id })}
              formatDate={formatDate}
            />
          </TabsContent>
          
          <TabsContent value="read" className="mt-4">
            <NotificationList 
              notifications={displayNotifications} 
              isLoading={isLoading}
              onMarkAsRead={(id) => markAsReadMutation.mutate({ id })}
              formatDate={formatDate}
            />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Digest Settings */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Resumos por Email
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure o envio de resumos consolidados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Resumo Diário</Label>
                      <p className="text-sm text-slate-500">Receba um resumo diário das atividades</p>
                    </div>
                    <Switch 
                      checked={preferences?.dailyDigest || false}
                      onCheckedChange={(checked) => handlePreferenceChange('dailyDigest', checked)}
                    />
                  </div>
                  
                  {preferences?.dailyDigest && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Horário do Resumo Diário</Label>
                      <Select 
                        value={preferences?.dailyDigestTime || "08:00"}
                        onValueChange={(value) => handlePreferenceChange('dailyDigestTime', value)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="06:00">06:00</SelectItem>
                          <SelectItem value="07:00">07:00</SelectItem>
                          <SelectItem value="08:00">08:00</SelectItem>
                          <SelectItem value="09:00">09:00</SelectItem>
                          <SelectItem value="18:00">18:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div>
                      <Label className="text-slate-300">Resumo Semanal</Label>
                      <p className="text-sm text-slate-500">Receba um resumo semanal completo</p>
                    </div>
                    <Switch 
                      checked={preferences?.weeklyDigest || false}
                      onCheckedChange={(checked) => handlePreferenceChange('weeklyDigest', checked)}
                    />
                  </div>
                  
                  {preferences?.weeklyDigest && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Dia do Resumo Semanal</Label>
                      <Select 
                        value={String(preferences?.weeklyDigestDay || 1)}
                        onValueChange={(value) => handlePreferenceChange('weeklyDigestDay', parseInt(value))}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Domingo</SelectItem>
                          <SelectItem value="1">Segunda-feira</SelectItem>
                          <SelectItem value="2">Terça-feira</SelectItem>
                          <SelectItem value="3">Quarta-feira</SelectItem>
                          <SelectItem value="4">Quinta-feira</SelectItem>
                          <SelectItem value="5">Sexta-feira</SelectItem>
                          <SelectItem value="6">Sábado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Notification Types */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Tipos de Notificação
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Escolha quais notificações deseja receber
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <Label className="text-slate-300">Documentos Vencendo</Label>
                    </div>
                    <Switch 
                      checked={preferences?.notifyDocumentExpiring !== false}
                      onCheckedChange={(checked) => handlePreferenceChange('notifyDocumentExpiring', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palmtree className="h-4 w-4 text-slate-400" />
                      <Label className="text-slate-300">Férias Vencendo</Label>
                    </div>
                    <Switch 
                      checked={preferences?.notifyVacationExpiring !== false}
                      onCheckedChange={(checked) => handlePreferenceChange('notifyVacationExpiring', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-slate-400" />
                      <Label className="text-slate-300">Novos Alertas</Label>
                    </div>
                    <Switch 
                      checked={preferences?.notifyNewAlert !== false}
                      onCheckedChange={(checked) => handlePreferenceChange('notifyNewAlert', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-400" />
                      <Label className="text-slate-300">Checklists Pendentes</Label>
                    </div>
                    <Switch 
                      checked={preferences?.notifyChecklistPending !== false}
                      onCheckedChange={(checked) => handlePreferenceChange('notifyChecklistPending', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <Label className="text-slate-300">Assinaturas Necessárias</Label>
                    </div>
                    <Switch 
                      checked={preferences?.notifySignatureRequired !== false}
                      onCheckedChange={(checked) => handlePreferenceChange('notifySignatureRequired', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gavel className="h-4 w-4 text-slate-400" />
                      <Label className="text-slate-300">Atualizações de Processos</Label>
                    </div>
                    <Switch 
                      checked={preferences?.notifyLawsuitUpdate !== false}
                      onCheckedChange={(checked) => handlePreferenceChange('notifyLawsuitUpdate', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Channels */}
              <Card className="bg-slate-800/50 border-slate-700 md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Canais de Notificação
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Escolha como deseja receber as notificações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-8">
                    <div className="flex items-center justify-between flex-1 p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <Bell className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <Label className="text-slate-300">Notificações no App</Label>
                          <p className="text-sm text-slate-500">Receba alertas dentro do sistema</p>
                        </div>
                      </div>
                      <Switch 
                        checked={preferences?.inAppEnabled !== false}
                        onCheckedChange={(checked) => handlePreferenceChange('inAppEnabled', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between flex-1 p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <Mail className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                          <Label className="text-slate-300">Notificações por Email</Label>
                          <p className="text-sm text-slate-500">Receba alertas por email</p>
                        </div>
                      </div>
                      <Switch 
                        checked={preferences?.emailEnabled !== false}
                        onCheckedChange={(checked) => handlePreferenceChange('emailEnabled', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Notification List Component
function NotificationList({ 
  notifications, 
  isLoading, 
  onMarkAsRead,
  formatDate 
}: { 
  notifications: any[] | undefined;
  isLoading: boolean;
  onMarkAsRead: (id: number) => void;
  formatDate: (date: string) => string;
}) {
  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-12 text-center text-slate-400">
          Carregando notificações...
        </CardContent>
      </Card>
    );
  }
  
  if (!notifications || notifications.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-12 text-center">
          <BellOff className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <p className="text-slate-400">Nenhuma notificação encontrada</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-0">
        <div className="divide-y divide-slate-700">
          {notifications.map((notification: any) => {
            const Icon = typeIcons[notification.type] || Bell;
            return (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-slate-700/30 transition-colors ${!notification.readAt ? 'bg-slate-700/20' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${!notification.readAt ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
                    <Icon className={`h-5 w-5 ${!notification.readAt ? 'text-blue-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-medium ${!notification.readAt ? 'text-slate-100' : 'text-slate-300'}`}>
                        {notification.title}
                      </h4>
                      <Badge className={priorityColors[notification.priority]}>
                        {priorityLabels[notification.priority]}
                      </Badge>
                      {!notification.readAt && (
                        <Badge className="bg-blue-500 text-white">Nova</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(notification.createdAt)}
                      </span>
                      <span>{typeLabels[notification.type]}</span>
                    </div>
                  </div>
                  {!notification.readAt && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
