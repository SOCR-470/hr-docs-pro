import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, Palmtree, Stethoscope, Baby, Heart, AlertTriangle } from "lucide-react";

interface VacationEvent {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentId: number | null;
  departmentName: string | null;
  type: "vacation" | "leave";
  leaveType?: string;
  startDate: Date;
  endDate: Date;
  status: string;
  days: number;
}

interface VacationCalendarProps {
  vacations: Array<{
    request: {
      id: number;
      employeeId: number;
      startDate: Date;
      endDate: Date;
      daysRequested: number;
      status: string;
    };
    employee: {
      id: number;
      name: string;
      departmentId: number | null;
    };
  }>;
  leaves: Array<{
    leave: {
      id: number;
      employeeId: number;
      leaveType: string;
      startDate: Date;
      endDate: Date | null;
      status: string;
    };
    employee: {
      id: number;
      name: string;
      departmentId: number | null;
    };
  }>;
  departments: Array<{
    id: number;
    name: string;
  }>;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const leaveTypeColors: Record<string, string> = {
  medical: "bg-red-200 border-red-400 text-red-900",
  accident: "bg-orange-200 border-orange-400 text-orange-900",
  maternity: "bg-pink-200 border-pink-400 text-pink-900",
  paternity: "bg-blue-200 border-blue-400 text-blue-900",
  bereavement: "bg-gray-200 border-gray-400 text-gray-900",
  wedding: "bg-rose-200 border-rose-400 text-rose-900",
  military: "bg-slate-200 border-slate-400 text-slate-900",
  jury_duty: "bg-amber-200 border-amber-400 text-amber-900",
  donation: "bg-red-100 border-red-300 text-red-800",
  other: "bg-gray-200 border-gray-400 text-gray-900",
};

const leaveTypeLabels: Record<string, string> = {
  medical: "Licença Médica",
  accident: "Acidente de Trabalho",
  maternity: "Licença Maternidade",
  paternity: "Licença Paternidade",
  bereavement: "Licença Nojo",
  wedding: "Licença Casamento",
  military: "Serviço Militar",
  jury_duty: "Júri",
  donation: "Doação de Sangue",
  other: "Outro",
};

const leaveTypeIcons: Record<string, any> = {
  medical: Stethoscope,
  accident: AlertTriangle,
  maternity: Baby,
  paternity: Baby,
  bereavement: Heart,
  wedding: Heart,
  default: Calendar,
};

export default function VacationCalendar({ vacations, leaves, departments }: VacationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  // Combine vacations and leaves into events
  const events = useMemo(() => {
    const allEvents: VacationEvent[] = [];

    // Add approved/in_progress vacations
    vacations
      .filter(v => ["approved", "in_progress", "completed"].includes(v.request.status))
      .forEach(v => {
        allEvents.push({
          id: v.request.id,
          employeeId: v.employee.id,
          employeeName: v.employee.name,
          departmentId: v.employee.departmentId,
          departmentName: departments.find(d => d.id === v.employee.departmentId)?.name || null,
          type: "vacation",
          startDate: new Date(v.request.startDate),
          endDate: new Date(v.request.endDate),
          status: v.request.status,
          days: v.request.daysRequested,
        });
      });

    // Add active leaves
    leaves
      .filter(l => l.leave.status === "active")
      .forEach(l => {
        allEvents.push({
          id: l.leave.id,
          employeeId: l.employee.id,
          employeeName: l.employee.name,
          departmentId: l.employee.departmentId,
          departmentName: departments.find(d => d.id === l.employee.departmentId)?.name || null,
          type: "leave",
          leaveType: l.leave.leaveType,
          startDate: new Date(l.leave.startDate),
          endDate: l.leave.endDate ? new Date(l.leave.endDate) : new Date(),
          status: l.leave.status,
          days: Math.ceil((new Date(l.leave.endDate || new Date()).getTime() - new Date(l.leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        });
      });

    // Filter by department
    if (selectedDepartment !== "all") {
      return allEvents.filter(e => e.departmentId === parseInt(selectedDepartment));
    }

    return allEvents;
  }, [vacations, leaves, departments, selectedDepartment]);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days: Array<{ date: Date | null; events: VacationEvent[] }> = [];
    
    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, events: [] });
    }
    
    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dayEvents = events.filter(e => {
        const start = new Date(e.startDate);
        const end = new Date(e.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        date.setHours(12, 0, 0, 0);
        return date >= start && date <= end;
      });
      days.push({ date, events: dayEvents });
    }
    
    return days;
  }, [currentDate, events]);

  // Get year overview data
  const yearOverview = useMemo(() => {
    const year = currentDate.getFullYear();
    const months: Array<{
      month: number;
      name: string;
      vacationDays: number;
      leaveDays: number;
      employees: Set<number>;
    }> = [];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      let vacationDays = 0;
      let leaveDays = 0;
      const employees = new Set<number>();

      events.forEach(e => {
        const start = new Date(e.startDate);
        const end = new Date(e.endDate);
        
        // Check if event overlaps with this month
        if (start <= monthEnd && end >= monthStart) {
          const overlapStart = start < monthStart ? monthStart : start;
          const overlapEnd = end > monthEnd ? monthEnd : end;
          const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          if (e.type === "vacation") {
            vacationDays += days;
          } else {
            leaveDays += days;
          }
          employees.add(e.employeeId);
        }
      });

      months.push({
        month,
        name: MONTHS[month],
        vacationDays,
        leaveDays,
        employees,
      });
    }

    return months;
  }, [currentDate, events]);

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const navigateYear = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(newDate.getFullYear() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventColor = (event: VacationEvent) => {
    if (event.type === "vacation") {
      return "bg-green-200 border-green-400 text-green-900";
    }
    return leaveTypeColors[event.leaveType || "other"] || leaveTypeColors.other;
  };

  const getEventIcon = (event: VacationEvent) => {
    if (event.type === "vacation") {
      return Palmtree;
    }
    return leaveTypeIcons[event.leaveType || "default"] || leaveTypeIcons.default;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendário de Férias e Afastamentos
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Departamentos</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="rounded-r-none"
              >
                Mês
              </Button>
              <Button
                variant={viewMode === "year" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("year")}
                className="rounded-l-none"
              >
                Ano
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => viewMode === "month" ? navigateMonth(-1) : navigateYear(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => viewMode === "month" ? navigateMonth(1) : navigateYear(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>
          
          <h3 className="text-lg font-semibold">
            {viewMode === "month" 
              ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : currentDate.getFullYear()
            }
          </h3>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-200 border border-green-400" />
              <span>Férias</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-200 border border-red-400" />
              <span>Afastamento</span>
            </div>
          </div>
        </div>

        {viewMode === "month" ? (
          /* Monthly View */
          <div className="border rounded-lg overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 bg-slate-100">
              {WEEKDAYS.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-slate-600 border-b">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[100px] p-1 border-b border-r ${
                    day.date ? "bg-white" : "bg-slate-50"
                  } ${isToday(day.date) ? "bg-blue-50" : ""}`}
                >
                  {day.date && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday(day.date) ? "text-blue-600" : "text-slate-700"
                      }`}>
                        {day.date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        <TooltipProvider>
                          {day.events.slice(0, 3).map(event => {
                            const Icon = getEventIcon(event);
                            return (
                              <Tooltip key={`${event.type}-${event.id}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`text-xs px-1 py-0.5 rounded border truncate cursor-pointer ${getEventColor(event)}`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Icon className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{event.employeeName.split(" ")[0]}</span>
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-semibold">{event.employeeName}</p>
                                    <p className="text-sm">
                                      {event.type === "vacation" ? "Férias" : leaveTypeLabels[event.leaveType || "other"]}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      {new Date(event.startDate).toLocaleDateString("pt-BR")} - {new Date(event.endDate).toLocaleDateString("pt-BR")}
                                    </p>
                                    <p className="text-sm text-slate-500">{event.days} dias</p>
                                    {event.departmentName && (
                                      <Badge variant="outline" className="text-xs">
                                        {event.departmentName}
                                      </Badge>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                        
                        {day.events.length > 3 && (
                          <div className="text-xs text-slate-500 px-1">
                            +{day.events.length - 3} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Yearly View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {yearOverview.map(month => (
              <Card 
                key={month.month} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  month.month === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => {
                  setCurrentDate(new Date(currentDate.getFullYear(), month.month, 1));
                  setViewMode("month");
                }}
              >
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">{month.name}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Férias:</span>
                      <span className="font-medium text-green-600">{month.vacationDays} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Afastamentos:</span>
                      <span className="font-medium text-red-600">{month.leaveDays} dias</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Funcionários:</span>
                      <span className="font-medium">{month.employees.size}</span>
                    </div>
                  </div>
                  
                  {/* Mini bar chart */}
                  <div className="mt-3 flex gap-1 h-2">
                    {month.vacationDays > 0 && (
                      <div 
                        className="bg-green-400 rounded"
                        style={{ 
                          width: `${Math.min((month.vacationDays / (month.vacationDays + month.leaveDays)) * 100, 100)}%` 
                        }}
                      />
                    )}
                    {month.leaveDays > 0 && (
                      <div 
                        className="bg-red-400 rounded"
                        style={{ 
                          width: `${Math.min((month.leaveDays / (month.vacationDays + month.leaveDays)) * 100, 100)}%` 
                        }}
                      />
                    )}
                    {month.vacationDays === 0 && month.leaveDays === 0 && (
                      <div className="bg-slate-200 rounded w-full" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-slate-500">Total de eventos: </span>
              <span className="font-semibold">{events.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Férias: </span>
              <span className="font-semibold text-green-600">
                {events.filter(e => e.type === "vacation").length}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Afastamentos: </span>
              <span className="font-semibold text-red-600">
                {events.filter(e => e.type === "leave").length}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Funcionários: </span>
              <span className="font-semibold">
                {new Set(events.map(e => e.employeeId)).size}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
