import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, User, AlertCircle, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("password");

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      setLocation("/");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  const handleOAuthLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">HR Docs Pro</h1>
          <p className="text-slate-400 mt-2">Sistema de Gestão de Documentos de RH</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-white">Entrar</CardTitle>
            <CardDescription className="text-slate-400">
              Escolha como deseja acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-700/50">
                <TabsTrigger value="password" className="data-[state=active]:bg-blue-600">
                  Email e Senha
                </TabsTrigger>
                <TabsTrigger value="oauth" className="data-[state=active]:bg-blue-600">
                  Manus OAuth
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    className="text-blue-400 hover:text-blue-300 p-0"
                    onClick={() => setLocation("/forgot-password")}
                  >
                    Esqueceu sua senha?
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="oauth">
                <div className="space-y-4">
                  <div className="text-center text-slate-300 mb-4">
                    <p className="text-sm">
                      Use sua conta Manus para acessar o sistema.
                      Recomendado para administradores.
                    </p>
                  </div>

                  <Button
                    onClick={handleOAuthLogin}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Entrar com Manus
                  </Button>

                  <div className="text-center text-xs text-slate-500 mt-4">
                    <p>Autenticação segura via OAuth 2.0</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-500 text-center">
              Ao entrar, você concorda com os termos de uso e política de privacidade.
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          © 2026 HR Docs Pro. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
