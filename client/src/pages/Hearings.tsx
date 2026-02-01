import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Eye,
  Edit,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Hearings() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLawsuitId, setSelectedLawsuitId] = useState<string>("");
  const [newHearing, setNewHearing] = useState({
    hearingType: "initial" as const,
    scheduledDate: "",
    scheduledTime: "",
    location: "",
    isVirtual: false,
    virtualLink: "",
    notes: "",
  });

  const { data: hearings, isLoading, refetch } = trpc.hearings.list.useQuery({});
  const { data: lawsuits } = trpc.lawsuits.list.useQuery({});
  const { data: upcomingHearings } = trpc.hearings.upcoming.useQuery({ days: 30 });

  const createMutation = trpc.hearings.create.useMutation({
    onSuccess: () => {
      toast.success("Audiência agendada com sucesso!");
      setIsCreateOpen(false);
      refetch();
      setNewHearing({
        hearingType: "initial",
        scheduledDate: "",
        scheduledTime: "",
        location: "",
        isVirtual: false,
        virtualLink: "",
        notes: "",
      });
      setSelectedLawsuitId("");
    },
    onError: (error) => {
      toast.error(`Erro ao agendar audiência: ${error.message}`);
    },
  });

  const deleteMutation = trpc.hearings.delete.useMutation({
    onSuccess: () => {
      toast.success("Audiência excluída com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir audiência: ${error.message}`);
    },
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getHearingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      initial: "Inicial",
      conciliation: "Conciliação",
      instruction: "Instrução",
      judgment: "Julgamento",
      other: "Outra",
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "Agendada",
      confirmed: "Confirmada",
      rescheduled: "Reagendada",
      completed: "Realizada",
      cancelled: "Cancelada",
      postponed: "Adiada",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      rescheduled: "bg-yellow-100 text-yellow-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
      postponed: "bg-orange-100 text-orange-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Calendar logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty days for the start of the week
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [currentDate]);

  const hearingsByDate = useMemo(() => {
    if (!hearings) return {};
    const map: Record<string, typeof hearings> = {};
    hearings.forEach((item) => {
      const dateKey = new Date(item.hearing.scheduledDate).toDateString();
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(item);
    });
    return map;
  }, [hearings]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleCreate = () => {
    if (!selectedLawsuitId || !newHearing.scheduledDate) {
      toast.error("Selecione o processo e a data da audiência");
      return;
    }
    createMutation.mutate({
      lawsuitId: parseInt(selectedLawsuitId),
      hearingType: newHearing.hearingType,
      scheduledDate: new Date(newHearing.scheduledDate),
      scheduledTime: newHearing.scheduledTime || undefined,
      location: newHearing.location || undefined,
      isVirtual: newHearing.isVirtual,
      virtualLink: newHearing.virtualLink || undefined,
      notes: newHearing.notes || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta audiência?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Audiências
          </h1>
          <p className="text-muted-foreground mt-1">
            Calendário de audiências e compromissos judiciais
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={(v: "calendar" | "list") => setViewMode(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calendar">Calendário</SelectItem>
              <SelectItem value="list">Lista</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Audiência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agendar Nova Audiência</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Processo *</Label>
                  <Select value={selectedLawsuitId} onValueChange={setSelectedLawsuitId}>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Audiência *</Label>
                    <Select
                      value={newHearing.hearingType}
                      onValueChange={(v: any) => setNewHearing({ ...newHearing, hearingType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial">Inicial</SelectItem>
                        <SelectItem value="conciliation">Conciliação</SelectItem>
                        <SelectItem value="instruction">Instrução</SelectItem>
                        <SelectItem value="judgment">Julgamento</SelectItem>
                        <SelectItem value="other">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={newHearing.scheduledDate}
                      onChange={(e) => setNewHearing({ ...newHearing, scheduledDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={newHearing.scheduledTime}
                      onChange={(e) => setNewHearing({ ...newHearing, scheduledTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Local</Label>
                    <Input
                      placeholder="Sala de audiências"
                      value={newHearing.location}
                      onChange={(e) => setNewHearing({ ...newHearing, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isVirtual"
                    checked={newHearing.isVirtual}
                    onCheckedChange={(checked) => setNewHearing({ ...newHearing, isVirtual: !!checked })}
                  />
                  <Label htmlFor="isVirtual">Audiência Virtual</Label>
                </div>

                {newHearing.isVirtual && (
                  <div className="space-y-2">
                    <Label>Link da Videoconferência</Label>
                    <Input
                      placeholder="https://..."
                      value={newHearing.virtualLink}
                      onChange={(e) => setNewHearing({ ...newHearing, virtualLink: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Anotações sobre a audiência..."
                    value={newHearing.notes}
                    onChange={(e) => setNewHearing({ ...newHearing, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Agendar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Upcoming Alerts */}
      {upcomingHearings && upcomingHearings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-800">
                {upcomingHearings.length} audiência(s) nos próximos 30 dias
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "calendar" ? (
        /* Calendar View */
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div key={day} className="text-center font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {daysInMonth.map((day, index) => {
                const dateKey = day?.toDateString();
                const dayHearings = dateKey ? hearingsByDate[dateKey] : [];
                const isToday = day?.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] border rounded-lg p-1 ${
                      day ? "bg-background" : "bg-muted/30"
                    } ${isToday ? "border-primary border-2" : ""}`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-1 mt-1">
                          {dayHearings?.slice(0, 3).map((item) => (
                            <div
                              key={item.hearing.id}
                              className="text-xs p-1 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                              title={`${item.hearing.scheduledTime || ""} - ${item.lawsuit?.processNumber}`}
                            >
                              {item.hearing.scheduledTime && (
                                <span className="font-medium">{item.hearing.scheduledTime} </span>
                              )}
                              {getHearingTypeLabel(item.hearing.hearingType)}
                            </div>
                          ))}
                          {dayHearings && dayHearings.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayHearings.length - 3} mais
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Carregando audiências...</div>
          ) : hearings && hearings.length > 0 ? (
            hearings.map((item) => (
              <Card key={item.hearing.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold">{item.lawsuit?.processNumber}</h3>
                        <Badge className={getStatusColor(item.hearing.status)}>
                          {getStatusLabel(item.hearing.status)}
                        </Badge>
                        <Badge variant="outline">
                          {getHearingTypeLabel(item.hearing.hearingType)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.lawsuit?.claimantName}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(item.hearing.scheduledDate)}</span>
                        </div>
                        {item.hearing.scheduledTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{item.hearing.scheduledTime}</span>
                          </div>
                        )}
                        {item.hearing.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{item.hearing.location}</span>
                          </div>
                        )}
                        {item.hearing.isVirtual && (
                          <div className="flex items-center gap-1">
                            <Video className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-500">Virtual</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/lawsuits/${item.hearing.lawsuitId}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Processo
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.hearing.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma audiência agendada</h3>
                <p className="text-muted-foreground mb-4">
                  Agende uma nova audiência para começar
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Audiência
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
