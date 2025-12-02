import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import apoloLogo from "@/assets/apolo-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignUp = location.pathname === '/cadastro';

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [conheceTechFinance, setConheceTechFinance] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar se já está autenticado
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate('/apolo/dashboard');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!email || !email.includes('@')) {
      toast.error('Preencha seu e-mail corretamente');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Confirme seu e-mail antes de fazer login');
      } else {
        toast.error('Verifique sua conexão e tente novamente');
      }
      return;
    }

    if (data.user) {
      toast.success('Login realizado com sucesso!');
      navigate('/apolo/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação dos campos
    if (!fullName || fullName.trim().length < 3) {
      toast.error('Nome deve ter no mínimo 3 caracteres');
      return;
    }

    if (!email || !email.includes('@')) {
      toast.error('Preencha um e-mail válido');
      return;
    }

    if (!phone || phone.length < 10) {
      toast.error('Preencha um telefone válido');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!areaAtuacao || areaAtuacao.trim().length < 2) {
      toast.error('Preencha a área de atuação');
      return;
    }

    setIsLoading(true);

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          area_atuacao: areaAtuacao,
          conhece_techfinance: conheceTechFinance,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (authError) {
      setIsLoading(false);
      if (authError.message.includes('already registered')) {
        toast.error('Este e-mail já está cadastrado');
      } else {
        toast.error('Erro ao criar conta: ' + authError.message);
      }
      return;
    }

    if (authData.user) {
      // Atualizar o perfil com os dados adicionais
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phone,
          area_atuacao: areaAtuacao,
          conhece_techfinance: conheceTechFinance,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
      } else {
        // Criar automaticamente o perfil pessoal no apolo_profiles
        const { error: apoloProfileError } = await supabase
          .from('apolo_profiles')
          .insert({
            user_id: authData.user.id,
            profile_type: 'personal',
            name: fullName,
            relationship: 'Titular'
          });

        if (apoloProfileError) {
          console.error('Erro ao criar perfil do Apolo:', apoloProfileError);
          toast.error('Conta criada, mas houve um erro ao criar seu perfil pessoal.');
        }
      }

      setIsLoading(false);

      toast.success('Conta criada com sucesso!');

      // Se o e-mail não precisar de confirmação, redirecionar
      if (authData.session) {
        navigate('/apolo/dashboard');
      } else {
        toast.info('Verifique seu e-mail para confirmar o cadastro');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border">
          {/* Logo e Título */}
          <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
            <img src={apoloLogo} alt="Apolo" className="h-12 mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">
              {isSignUp ? 'Crie sua conta' : 'Faça login para acessar o sistema'}
            </p>
          </div>

          {/* Toggle Login/SignUp */}
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => navigate('/entrar')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${!isSignUp
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/cadastro')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${isSignUp
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Formulário de Login */}
          {!isSignUp && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-12"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          )}

          {/* Formulário de Cadastro */}
          {isSignUp && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupEmail">E-mail</Label>
                <Input
                  id="signupEmail"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupPassword">Senha</Label>
                <div className="relative">
                  <Input
                    id="signupPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="areaAtuacao">Área de Atuação</Label>
                <Input
                  id="areaAtuacao"
                  type="text"
                  placeholder="Ex: Médico"
                  value={areaAtuacao}
                  onChange={(e) => setAreaAtuacao(e.target.value)}
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="conheceTechFinance"
                  checked={conheceTechFinance}
                  onCheckedChange={(checked) => setConheceTechFinance(checked as boolean)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="conheceTechFinance"
                  className="text-sm font-normal cursor-pointer"
                >
                  Já nos conhece?
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>
          )}
        </div>

        {/* Nota de desenvolvimento */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Ambiente de desenvolvimento
        </p>
      </div>
    </div>
  );
};

export default Login;
