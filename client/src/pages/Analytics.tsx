import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Users,
  Building2,
  BarChart3,
  LineChart,
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";

export default function Analytics() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: employees } = trpc.employees.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();
  
  const { data: batchAnalysis, isLoading: loadingBatch, refetch: refetchBatch } = 
    trpc.analytics.batchPredictive.useQuery();
  
  const { data: departmentBenchmark, isLoading: loadingBenchmark } = 
    trpc.analytics.departmentBenchmark.useQuery(
      selectedDepartment && selectedDepartment !== "all" ? { departmentId: parseInt(selectedDepartment) } : undefined
    );
  
  const { data: employeeEvolution, isLoading: loadingEvolution } = 
    trpc.analytics.employeeEvolution.useQuery(
      { employeeId: parseInt(selectedEmployee), months: 6 },
      { enabled: !!selectedEmployee }
    );
  
  const { data: payslipComparison } = trpc.analytics.payslipVsContract.useQuery(
    { employeeId: parseInt(selectedEmployee) },
    { enabled: !!selectedEmployee }
  );

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "bg-emerald-100 text-emerald-700";
      case "medium": return "bg-amber-100 text-amber-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "critical": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low": return "Baixo";
      case "medium": return "Médio";
      case "high": return "Alto";
      case "critical": return "Crítico";
      default: return level;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "declining": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics de Compliance</h1>
          <p className="text-slate-500 mt-1">Análise preditiva e comparativa de conformidade</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetchBatch()}
          disabled={loadingBatch}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingBatch ? 'animate-spin' : ''}`} />
          Atualizar Análise
        </Button>
      </div>

      <Tabs defaultValue="predictive" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="predictive" className="gap-2">
            <Target className="h-4 w-4" />
            Análise Preditiva
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-2">
            <Building2 className="h-4 w-4" />
            Benchmark Departamentos
          </TabsTrigger>
          <TabsTrigger value="evolution" className="gap-2">
            <LineChart className="h-4 w-4" />
            Evolução Individual
          </TabsTrigger>
        </TabsList>

        {/* Análise Preditiva */}
        <TabsContent value="predictive" className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Risco Crítico</p>
                    <p className="text-2xl font-bold text-red-600">
                      {batchAnalysis?.filter(a => a.riskLevel === "critical").length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Risco Alto</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {batchAnalysis?.filter(a => a.riskLevel === "high").length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Risco Médio</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {batchAnalysis?.filter(a => a.riskLevel === "medium").length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-full">
                    <BarChart3 className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Baixo Risco</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {batchAnalysis?.filter(a => a.riskLevel === "low").length || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-full">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Funcionários por Risco */}
          <Card>
            <CardHeader>
              <CardTitle>Funcionários por Nível de Risco</CardTitle>
              <CardDescription>
                Ordenados do maior para o menor risco de compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBatch ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {batchAnalysis?.map((analysis) => (
                    <div 
                      key={analysis.employeeId}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{analysis.employeeName}</p>
                          <div className="flex gap-2 mt-1">
                            {analysis.factors.slice(0, 2).map((factor, idx) => (
                              <span key={idx} className="text-xs text-slate-500">
                                {factor.factor}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Score de Risco</p>
                          <p className="text-lg font-bold">{analysis.riskScore}</p>
                        </div>
                        <Progress 
                          value={analysis.riskScore} 
                          className="w-24 h-2"
                        />
                        <Badge className={getRiskColor(analysis.riskLevel)}>
                          {getRiskLabel(analysis.riskLevel)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {(!batchAnalysis || batchAnalysis.length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p>Nenhuma análise disponível</p>
                      <p className="text-sm">Clique em "Atualizar Análise" para gerar</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benchmark por Departamento */}
        <TabsContent value="benchmark" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Todos os departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingBenchmark ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departmentBenchmark?.map((dept) => (
                <Card key={dept.departmentId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{dept.departmentName}</CardTitle>
                          <CardDescription>{dept.employeeCount} funcionários</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {dept.avgComplianceScore.toFixed(0)}%
                        </p>
                        <p className="text-xs text-slate-500">Score médio</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-slate-500">Docs/Funcionário</p>
                          <p className="text-lg font-semibold">
                            {dept.avgDocumentsPerEmployee.toFixed(1)}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-slate-500">Alertas/Funcionário</p>
                          <p className="text-lg font-semibold">
                            {dept.avgAlertsPerEmployee.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      
                      {dept.topPerformers.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-emerald-600 mb-2">
                            Top Performers
                          </p>
                          <div className="space-y-1">
                            {dept.topPerformers.map((emp) => (
                              <div key={emp.id} className="flex items-center justify-between text-sm">
                                <span>{emp.name}</span>
                                <Badge variant="outline" className="text-emerald-600">
                                  {emp.score}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {dept.needsAttention.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-amber-600 mb-2">
                            Precisam de Atenção
                          </p>
                          <div className="space-y-1">
                            {dept.needsAttention.map((emp) => (
                              <div key={emp.id} className="flex items-center justify-between text-sm">
                                <span>{emp.name}</span>
                                <Badge variant="outline" className="text-amber-600">
                                  {emp.score}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(!departmentBenchmark || departmentBenchmark.length === 0) && (
                <Card className="col-span-2">
                  <CardContent className="py-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">Nenhum departamento encontrado</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Evolução Individual */}
        <TabsContent value="evolution" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployee ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evolução */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Evolução de Compliance</CardTitle>
                      <CardDescription>Últimos 6 meses</CardDescription>
                    </div>
                    {employeeEvolution && (
                      <div className="flex items-center gap-2">
                        {getTrendIcon(employeeEvolution.trend)}
                        <span className={`text-sm font-medium ${
                          employeeEvolution.trend === "improving" ? "text-emerald-600" :
                          employeeEvolution.trend === "declining" ? "text-red-600" : "text-slate-600"
                        }`}>
                          {employeeEvolution.trendPercentage > 0 ? "+" : ""}
                          {employeeEvolution.trendPercentage.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingEvolution ? (
                    <Skeleton className="h-48" />
                  ) : employeeEvolution ? (
                    <div className="space-y-4">
                      {employeeEvolution.periods.map((period, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <span className="text-sm text-slate-500 w-16">{period.period}</span>
                          <div className="flex-1">
                            <Progress value={period.complianceScore} className="h-3" />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {period.complianceScore}%
                          </span>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span>{period.documentsCount} docs</span>
                            <span>{period.alertsCount} alertas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      Selecione um funcionário para ver a evolução
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Comparação Holerite vs Contrato */}
              <Card>
                <CardHeader>
                  <CardTitle>Holerite vs Contrato</CardTitle>
                  <CardDescription>Comparação de valores salariais</CardDescription>
                </CardHeader>
                <CardContent>
                  {payslipComparison ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-500">Salário Contrato</p>
                          <p className="text-xl font-bold">
                            {payslipComparison.contractSalary 
                              ? `R$ ${payslipComparison.contractSalary.toLocaleString('pt-BR')}`
                              : "N/A"}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-500">Último Holerite</p>
                          <p className="text-xl font-bold">
                            {payslipComparison.latestPayslipSalary 
                              ? `R$ ${payslipComparison.latestPayslipSalary.toLocaleString('pt-BR')}`
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${
                        payslipComparison.status === "match" ? "bg-emerald-50" :
                        payslipComparison.status === "mismatch" ? "bg-amber-50" : "bg-slate-50"
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {payslipComparison.status === "match" ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                          ) : payslipComparison.status === "mismatch" ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Minus className="h-5 w-5 text-slate-400" />
                          )}
                          <span className="font-medium">
                            {payslipComparison.status === "match" ? "Valores Compatíveis" :
                             payslipComparison.status === "mismatch" ? "Divergência Detectada" :
                             "Dados Insuficientes"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{payslipComparison.details}</p>
                        
                        {payslipComparison.differencePercentage !== null && (
                          <div className="mt-3 flex items-center gap-2">
                            {payslipComparison.differencePercentage > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              Diferença: {Math.abs(payslipComparison.differencePercentage).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      Selecione um funcionário para ver a comparação
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <LineChart className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">Selecione um funcionário para ver a análise individual</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
