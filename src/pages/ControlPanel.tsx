import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Info, Plus, Minus, User, TrendingUp, Target, PiggyBank, DollarSign, BarChart3 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateApoloProjections,
  calculateApoloMetrics,
  getYearlyProjections,
  type ApoloFormData
} from "@/hooks/useApoloCalculations";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { UserProfileMenu } from "@/components/UserProfileMenu";


// Helper function to format currency in Brazilian format
const formatBRL = (value: number): string => {
  const fixed = value.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formattedInteger},${decimalPart}`;
};

const ControlPanel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get("profileId");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyId, setStudyId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileAge, setProfileAge] = useState<number | null>(null);
  const [profileRelationship, setProfileRelationship] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("perfil");
  const [formData, setFormData] = useState({
    currentAge: 30,
    applicationPeriod: 25,
    initialCapital: 5000,
    contributionExpectation: 1000,
    contributionFrequency: "Mensal",
    returnRate: 10,
    returnRatePeriod: "Anual",
    inflation: 3.75,
    inflationPeriod: "Anual",
    adjustCapitalInflation: true,
    adjustContributionsInflation: true,
    realGrowthContributions: 1,
    enableRealGrowth: true,
    includeTax: true,
    taxRate: 15
  });



  const handleProfileClick = () => {
    navigate("/profile");
  };

  // Load profile and study data
  useEffect(() => {
    if (profileId) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [profileId]);
  const loadProfileData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        navigate("/");
        return;
      }

      // Load profile
      const {
        data: profile,
        error: profileError
      } = await supabase.from("apolo_profiles").select("*").eq("id", profileId).eq("user_id", user.id).single();
      if (profileError) throw profileError;
      setProfileName(profile.name);
      setProfileAge(profile.age);
      setProfileRelationship(profile.relationship);

      // Load or create study
      const {
        data: studies,
        error: studiesError
      } = await supabase.from("financial_studies").select("*").eq("consultant_id", user.id).or(`profile_id.eq.${profileId},client_id.eq.${profileId}`).order("created_at", {
        ascending: false
      }).limit(1);
      if (studiesError) throw studiesError;
      if (studies && studies.length > 0) {
        const study = studies[0];
        setStudyId(study.id);
        setFormData({
          currentAge: study.current_age,
          applicationPeriod: study.application_period,
          initialCapital: Number(study.initial_capital),
          contributionExpectation: Number(study.contribution_expectation),
          contributionFrequency: study.contribution_frequency,
          returnRate: Number(study.return_rate),
          returnRatePeriod: "Anual",
          enableRealGrowth: study.real_growth_contributions !== 0,
          inflation: Number(study.inflation),
          inflationPeriod: "Anual",
          adjustCapitalInflation: study.adjust_capital_inflation,
          adjustContributionsInflation: study.adjust_contributions_inflation,
          realGrowthContributions: Number(study.real_growth_contributions),
          includeTax: study.include_tax,
          taxRate: Number(study.tax_rate)
        });
      } else if (profile.age) {
        // Auto-fill age from profile if no study exists
        setFormData(prev => ({
          ...prev,
          currentAge: profile.age
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do perfil");
    } finally {
      setLoading(false);
    }
  };

  // Autosave with debounce
  useEffect(() => {
    if (!profileId || !studyId || loading) return;
    const timeoutId = setTimeout(async () => {
      try {
        const {
          error
        } = await supabase.from("financial_studies").update({
          current_age: formData.currentAge || 0,
          application_period: formData.applicationPeriod || 0,
          initial_capital: formData.initialCapital || 0,
          contribution_expectation: formData.contributionExpectation || 0,
          contribution_frequency: formData.contributionFrequency,
          return_rate: formData.returnRate || 0,
          inflation: formData.inflation || 0,
          adjust_capital_inflation: formData.adjustCapitalInflation,
          adjust_contributions_inflation: formData.adjustContributionsInflation,
          real_growth_contributions: formData.realGrowthContributions,
          include_tax: formData.includeTax,
          tax_rate: formData.taxRate
        }).eq("id", studyId);
        if (error) throw error;
      } catch (error) {
        console.error("Erro ao salvar:", error);
      }
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [formData, studyId, profileId, loading]);
  const updateField = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  const incrementValue = (field: string, step: number) => {
    const currentValue = formData[field as keyof typeof formData] as number;
    updateField(field, currentValue + step);
  };
  const decrementValue = (field: string, step: number) => {
    const currentValue = formData[field as keyof typeof formData] as number;
    updateField(field, currentValue - step);
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-lg">Carregando...</p>
    </div>;
  }
  if (!profileId) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-lg">Nenhum perfil selecionado</p>
      <Button onClick={() => navigate("/apolo/dashboard")}>
        Voltar ao Dashboard
      </Button>
    </div>;
  }
  return <div className="min-h-screen bg-background">
    {/* Header */}
    <header className="border-b border-border bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/apolo/dashboard")} className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Dashboard</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Info className="h-5 w-5" />
          </Button>
          <UserProfileMenu
            onProfileClick={handleProfileClick}
          />
        </div>
      </div>
    </header>



    {/* Sidebar and Main Content */}
    <div className="flex flex-col lg:flex-row">
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <aside className="hidden lg:block lg:w-64 border-r border-border bg-card min-h-[calc(100vh-73px)]">
        <div className="p-6">
          <p className="text-xs font-medium text-muted-foreground mb-4">MENU:</p>
          <nav className="space-y-2">
            <button className="w-full text-left px-3 py-2 rounded bg-secondary text-foreground font-medium text-sm">
              Painel de Controle
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-semibold mb-1">
              Painel de Controle - {profileName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Configure os parâmetros do estudo financeiro
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="start" className="text-xs sm:text-sm py-2">
                <span className="sm:hidden">INÍCIO</span>
                <span className="hidden sm:inline">COMECE POR AQUI</span>
              </TabsTrigger>
              <TabsTrigger value="perfil" className="text-xs sm:text-sm py-2">PERFIL</TabsTrigger>
              <TabsTrigger value="formulario" className="text-xs sm:text-sm py-2">FORMULÁRIO</TabsTrigger>
              <TabsTrigger value="painel" disabled={!studyId} className="text-xs sm:text-sm py-2">ESTUDO</TabsTrigger>
            </TabsList>

            {/* COMECE POR AQUI TAB */}
            <TabsContent value="start">
              <Card>
                <CardHeader>
                  <CardTitle>Bem-vindo ao Apolo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src="https://player.vimeo.com/video/1136237214?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479"
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      title="TUTORIAL - APOLO - ADL"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PERFIL TAB */}
            <TabsContent value="perfil">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações do Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Nome:</Label>
                      <p className="text-base">{profileName}</p>
                    </div>
                    {profileAge && <div className="space-y-2">
                      <Label className="text-sm font-medium">Idade:</Label>
                      <p className="text-base">{profileAge} anos</p>
                    </div>}
                    {profileRelationship && <div className="space-y-2">
                      <Label className="text-sm font-medium">Parentesco:</Label>
                      <p className="text-base">{profileRelationship}</p>
                    </div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FORMULÁRIO TAB */}
            <TabsContent value="formulario">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    PAINEL DE CONTROLE - {profileName}
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    Redefinir Configurações
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">1. Idade atual:</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" value={formData.currentAge} onChange={e => updateField("currentAge", e.target.value === '' ? '' : Number(e.target.value))} className="h-11" min="0" />
                        <span className="text-sm text-muted-foreground">Anos</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • Insira a idade atual
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">2. Período de Aplicação:</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" value={formData.applicationPeriod} onChange={e => updateField("applicationPeriod", e.target.value === '' ? '' : Number(e.target.value))} className="h-11" min="0" />
                        <span className="text-sm text-muted-foreground">Anos</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • Atenção: Prazo máximo, 50 anos.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">3. Capital Inicial:</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">R$</span>
                        <Input type="number" step="any" value={formData.initialCapital} onChange={e => updateField("initialCapital", e.target.value === '' ? '' : Number(e.target.value))} className="h-11" min="0" />
                        <Button variant="outline" size="icon" onClick={() => incrementValue("initialCapital", 1000)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => decrementValue("initialCapital", 1000)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • Não considerar bens imóveis e automóveis, regra geral.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">4. Expectativa de aporte:</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">R$</span>
                        <Input type="number" step="any" value={formData.contributionExpectation} onChange={e => updateField("contributionExpectation", e.target.value === '' ? '' : Number(e.target.value))} className="h-11" min="0" />
                        <Button variant="outline" size="icon" onClick={() => incrementValue("contributionExpectation", 100)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => decrementValue("contributionExpectation", 100)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Select value={formData.contributionFrequency} onValueChange={value => updateField("contributionFrequency", value)}>
                          <SelectTrigger className="h-9 sm:h-11 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mensal">Mensal</SelectItem>
                            <SelectItem value="Anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • Selecione o seu modelo de aporte. Se possível, utilize aportes mensais.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">5. Taxa de Retorno:</Label>
                      <div className="flex items-center gap-2">
                        <Input type="text" inputMode="decimal" value={formData.returnRate} onChange={e => {
                          const value = e.target.value.replace(',', '.');
                          const numValue = parseFloat(value) || 0;
                          if (value === '' || !isNaN(numValue)) {
                            updateField("returnRate", value === '' ? 0 : numValue);
                          }
                        }} className="h-11" />
                        <span className="text-sm">%</span>
                        <Button variant="outline" size="icon" onClick={() => incrementValue("returnRate", 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => decrementValue("returnRate", 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Select value={formData.returnRatePeriod} onValueChange={value => updateField("returnRatePeriod", value)}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Anual">Anual</SelectItem>
                            <SelectItem value="Mensal">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • Evite considerar expectativa de rentabilidade apenas de Investimentos em Renda Variável.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">6. Inflação:</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formData.inflation}
                          onChange={e => {
                            const value = e.target.value.replace(',', '.');
                            // Permite strings vazias, números válidos e números parciais como "3."
                            if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                              // Se for vazio, define como 0; senão mantém o valor (pode ser string com ponto)
                              updateField("inflation", value === '' ? 0 : value);
                            }
                          }}
                          onBlur={e => {
                            // Ao sair do campo, converte para número válido
                            const value = e.target.value.replace(',', '.');
                            const numValue = parseFloat(value) || 0;
                            updateField("inflation", numValue);
                          }}
                          className="h-11"
                        />
                        <span className="text-sm">%</span>
                        <Button variant="outline" size="icon" onClick={() => incrementValue("inflation", 0.25)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => decrementValue("inflation", 0.25)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Select value={formData.inflationPeriod} onValueChange={value => updateField("inflationPeriod", value)}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Anual">Anual</SelectItem>
                            <SelectItem value="Mensal">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • Sugerimos como referência a meta de inflação de longo prazo do Banco Central do Brasil. (bcb.gov.br)
                      </p>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="pt-6 border-t border-border">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                      <span className="font-medium">
                        Configurações Avançadas (Variáveis da Projeção)
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {showAdvanced ? "Clique para minimizar" : "Clique para expandir"}
                      </span>
                    </button>

                    {showAdvanced && <div className="mt-6 space-y-6">
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            1. Corrigir patrimônio pela inflação:
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            • Selecione essa opção para considerar o efeito da inflação no planejamento patrimonial
                          </p>
                        </div>
                        <Switch checked={formData.adjustCapitalInflation} onCheckedChange={checked => updateField("adjustCapitalInflation", checked)} />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            2. Corrigir aportes pela inflação:
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            • Faça com que os aportes cresçam na mesma medida da inflação desejada.
                          </p>
                        </div>
                        <Switch checked={formData.adjustContributionsInflation} onCheckedChange={checked => updateField("adjustContributionsInflation", checked)} />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            3. Utilizar crescimento real dos aportes:
                          </Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              step="any"
                              value={formData.realGrowthContributions}
                              onChange={e => updateField("realGrowthContributions", Number(e.target.value))}
                              className="h-11 w-32"
                              disabled={!formData.enableRealGrowth}
                            />
                            <span className="text-sm">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            • Utilize essa taxa para projetar o crescimento dos aportes acima da correção pela inflação. Referência de 1% a 3%.
                          </p>
                        </div>
                        <Switch
                          checked={formData.enableRealGrowth}
                          onCheckedChange={checked => {
                            updateField("enableRealGrowth", checked);
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            4. Incluir imposto de renda:
                          </Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={formData.taxRate}
                              onChange={e => {
                                const value = e.target.value.replace(',', '.');
                                const numValue = parseFloat(value);
                                if (value === '' || !isNaN(numValue)) {
                                  updateField("taxRate", value === '' ? 0 : numValue);
                                }
                              }}
                              className="h-11 w-32"
                            />
                            <span className="text-sm">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            • Considere neste campo a alíquota média do imposto de renda sobre os seus resgates. Recomendável alíquota de 15%.
                          </p>
                        </div>
                        <Switch checked={formData.includeTax} onCheckedChange={checked => updateField("includeTax", checked)} />
                      </div>
                    </div>}
                  </div>

                  <div className="pt-6">
                    <Button className="w-full h-12 text-base" size="lg" onClick={async () => {
                      if (!profileId) {
                        toast.error("Selecione um perfil primeiro");
                        return;
                      }
                      try {
                        const {
                          data: {
                            user
                          }
                        } = await supabase.auth.getUser();
                        if (!user) {
                          toast.error("Você precisa estar logado");
                          return;
                        }
                        let currentStudyId = studyId;

                        // Create study if it doesn't exist
                        if (!currentStudyId) {
                          const {
                            data: newStudy,
                            error
                          } = await supabase.from("financial_studies").insert({
                            profile_id: profileId,
                            consultant_id: user.id,
                            current_age: formData.currentAge || 0,
                            application_period: formData.applicationPeriod || 0,
                            initial_capital: formData.initialCapital || 0,
                            contribution_expectation: formData.contributionExpectation || 0,
                            contribution_frequency: formData.contributionFrequency,
                            return_rate: formData.returnRate || 0,
                            inflation: formData.inflation || 0,
                            adjust_capital_inflation: formData.adjustCapitalInflation,
                            adjust_contributions_inflation: formData.adjustContributionsInflation,
                            real_growth_contributions: formData.realGrowthContributions,
                            include_tax: formData.includeTax,
                            tax_rate: formData.taxRate
                          }).select().single();
                          if (error) throw error;
                          currentStudyId = newStudy.id;
                          setStudyId(currentStudyId);
                        }
                        toast.success("Estudo salvo com sucesso!");
                      } catch (error: any) {
                        console.error("Erro ao criar estudo:", error);
                        const msg = error?.message || error?.hint || "Erro ao criar estudo";
                        toast.error(`Erro ao criar estudo: ${msg}`);
                      }
                    }} disabled={loading || !profileId}>
                      SALVAR ESTUDO
                    </Button>

                    <Button onClick={() => {
                      if (studyId) {
                        setActiveTab("painel");
                      } else {
                        toast.error("Salve o estudo primeiro");
                      }
                    }} disabled={!profileId || !studyId} variant="outline" className="w-full h-12 text-base mt-2" size="lg">
                      VER ESTUDO
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PAINEL TAB - Gráficos */}
            <TabsContent value="painel">
              {studyId ? (() => {
                // Converter formData para formato Apolo
                const apoloData: ApoloFormData = {
                  currentAge: formData.currentAge || 0,
                  capitalInicial: formData.initialCapital || 0,
                  aporte: {
                    value: formData.contributionExpectation || 0,
                    type: formData.contributionFrequency === 'Mensal' ? 'montly' : 'yearly'
                  },
                  taxaDaAplicacao: {
                    value: Number(formData.returnRate) || 0,
                    type: formData.returnRatePeriod === 'Mensal' ? 'montly' : 'yearly'
                  },
                  periodoDeAplicacao: formData.applicationPeriod || 0,
                  inflacao: {
                    value: Number(formData.inflation) || 0,
                    type: formData.inflationPeriod === 'Mensal' ? 'montly' : 'yearly'
                  },
                  dynamic: false, // Não implementado ainda
                  advancedConfiguration: {
                    fixInflation: formData.adjustCapitalInflation,
                    fixInflationOnAporte: formData.adjustContributionsInflation,
                    aporteCrescimento: {
                      value: formData.realGrowthContributions > 0,
                      percentage: formData.realGrowthContributions
                    },
                    impostoDeRenda: {
                      value: formData.includeTax,
                      percentage: formData.taxRate
                    }
                  }
                };

                // Calcular projeções
                const projections = calculateApoloProjections(apoloData);
                const metrics = calculateApoloMetrics(projections, apoloData);

                const finalBalance = metrics.patrimonioFinal;
                const totalContributions = metrics.totalAportado;
                const totalGains = metrics.totalJuros;
                const contributionPercentage = metrics.percentualAportes * 100;
                const gainsPercentage = metrics.percentualJuros * 100;
                const monthlyPassiveIncome = metrics.rendaPassivaMensal;

                // Primeiro milhão
                const primeiroMilhao = metrics.primeiroMilhao;
                let milestoneReached: string | null = null;
                let milestoneDate: string | null = null;
                let milestoneYearsApplied: number | null = null;

                if (primeiroMilhao) {
                  milestoneReached = 'R$ 1 Milhão';
                  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                  const monthName = monthNames[primeiroMilhao.month];
                  const ano = new Date(primeiroMilhao.date).getFullYear();
                  const idade = formData.currentAge + primeiroMilhao.keyYear;
                  milestoneDate = `${monthName}/${ano}`;
                  milestoneYearsApplied = primeiroMilhao.keyYear;
                }


                // Get yearly data for chart
                const currentYear = new Date().getFullYear();
                const yearlyData = getYearlyProjections(projections, apoloData);
                const chartData = yearlyData.map(y => ({
                  ano: y.year,
                  displayYear: currentYear + y.year,
                  idade: formData.currentAge + y.year,
                  patrimonio: y.patrimonio / 1000, // Convert to thousands
                  aportes: y.aportes / 1000
                }));

                // Get yearly data for table (every year)
                const tableData = yearlyData.map((y, index, arr) => {
                  const prevYear = index > 0 ? arr[index - 1] : { aportes: 0, juros: 0 };

                  return {
                    year: y.year,
                    age: formData.currentAge + y.year,
                    contribution: y.aportes - prevYear.aportes,
                    gains: y.juros - prevYear.juros,
                    contributionPercent: y.aportePercent * 100,
                    gainsPercent: y.jurosPercent * 100
                  };
                });

                // Filter for table display (every 5 years, excluding year 0)
                const filteredTableData = tableData.filter(row => row.year > 0 && row.year % 5 === 0);

                return <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-semibold mb-1">Painel de Evolução Patrimonial</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Planejamento financeiro de longo prazo
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                    {/* Left column - Metrics and Chart */}
                    <div className="xl:col-span-2 space-y-4 sm:space-y-6">
                      {/* Metric Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Card className="bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200">
                          <CardContent className="pt-4 sm:pt-6">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                  Seu patrimônio {apoloData.advancedConfiguration.fixInflation ? "(corrigido pela inflação)" : "(nominal)"} em {formData.applicationPeriod} anos será:
                                </p>
                                <p className="text-lg sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400 break-words">
                                  {formatBRL(finalBalance)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Tendo você {formData.currentAge + formData.applicationPeriod} anos
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                          <CardContent className="pt-4 sm:pt-6">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                  {milestoneDate ? 'Alcançará R$ 1 Milhão em:' : 'Meta não alcançada'}
                                </p>
                                <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                                  {milestoneDate || '-'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {milestoneDate ? `Aos ${formData.currentAge + (milestoneYearsApplied ?? 0)} anos (${milestoneYearsApplied ?? 0} anos de aplicação)` : ''}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-200">
                          <CardContent className="pt-4 sm:pt-6">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                                <PiggyBank className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                  Capital Inicial + Aportes {apoloData.advancedConfiguration.fixInflation ? "(corrigido pela inflação)" : "(nominal)"}:
                                </p>
                                <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 break-words">
                                  {formatBRL(totalContributions)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {contributionPercentage.toFixed(1)}% do patrimônio total
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200">
                          <CardContent className="pt-4 sm:pt-6">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                                  Ganhos com Juros {apoloData.advancedConfiguration.fixInflation ? "(corrigido pela inflação)" : "(nominal)"}:
                                </p>
                                <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 break-words">
                                  {formatBRL(totalGains)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {gainsPercentage.toFixed(1)}% do patrimônio total
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Passive Income Card */}
                      <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 text-white border-0 shadow-lg">
                        <CardContent className="py-4 sm:py-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                              <div>
                                <p className="text-sm sm:text-base font-semibold">Renda Passiva Mensal {apoloData.advancedConfiguration.fixInflation ? "(corrigida pela inflação)" : "(nominal)"}</p>
                                <p className="text-xs opacity-80 mt-0.5">Baseada na taxa real líquida de retorno</p>
                              </div>
                            </div>
                            <p className="text-xl sm:text-3xl font-bold flex-shrink-0">
                              {formatBRL(monthlyPassiveIncome)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Chart */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-5 sm:h-6 bg-cyan-500 rounded"></div>
                            <CardTitle className="text-base sm:text-lg">Evolução Patrimonial (R$ Mil)</CardTitle>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {apoloData.advancedConfiguration.fixInflation ? "Patrimônio Real" : "Patrimônio Nominal"}
                            {formData.realGrowthContributions > 0 ? " | Com Crescimento Salarial" : ""}
                            {formData.includeTax ? " | Com IR" : ""}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[250px] sm:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{
                                top: 20,
                                right: 5,
                                left: 0,
                                bottom: 20
                              }}>
                                <defs>
                                  <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0e7490" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.8} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis
                                  dataKey="displayYear"
                                  tick={{ fontSize: 10 }}
                                  stroke="hsl(var(--muted-foreground))"
                                  angle={-90}
                                  textAnchor="end"
                                  height={50}
                                  interval={0}
                                />
                                <YAxis hide />
                                <Tooltip
                                  formatter={(value: number) => formatBRL(value * 1000)}
                                  labelFormatter={label => `Ano ${label}`}
                                  cursor={{ fill: 'transparent' }}
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                  }}
                                />
                                <Bar dataKey="patrimonio" fill="url(#colorPatrimonio)" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="patrimonio" position="top" formatter={(val: number) => val.toFixed(0) + 'k'} style={{ fontSize: '10px', fill: 'hsl(var(--foreground))' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right column - Table */}
                    <div className="xl:col-span-1">
                      <Card className="h-full">
                        <CardHeader className="pb-2 sm:pb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1 h-5 sm:h-6 bg-primary rounded"></div>
                            <CardTitle className="text-sm sm:text-base">Processo de Formação do Patrimônio</CardTitle>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Representatividade Aportes vs Juros
                          </p>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="overflow-auto max-h-[400px] sm:max-h-[600px]">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-muted/50 border-b">
                                <tr>
                                  <th className="px-2 sm:px-3 py-2 text-center font-medium text-xs">ANO</th>
                                  <th className="px-2 sm:px-3 py-2 text-center font-medium text-xs">APORTE</th>
                                  <th className="px-2 sm:px-3 py-2 text-center font-medium w-[120px] text-xs">COMPOSIÇÃO</th>
                                  <th className="px-2 sm:px-3 py-2 text-center font-medium text-xs">JUROS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {filteredTableData.map((row, index) => <tr key={index} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                                  <td className="px-2 sm:px-3 py-2 font-medium text-center text-xs">{row.year}º</td>
                                  <td className="px-2 sm:px-3 py-2 text-center text-xs">{row.contributionPercent.toFixed(0)}%</td>
                                  <td className="px-2 sm:px-3 py-2">
                                    <div className="flex gap-1 h-3 sm:h-4 w-full">
                                      <div className="bg-[#0ea5e9] rounded-l-full" style={{
                                        width: `${row.contributionPercent}%`
                                      }} />
                                      <div className="bg-[#22c55e] rounded-r-full" style={{
                                        width: `${row.gainsPercent}%`
                                      }} />
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-center text-xs">{row.gainsPercent.toFixed(0)}%</td>
                                </tr>)}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>;
              })() : <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">
                    Salve o estudo primeiro para visualizar os gráficos
                  </p>
                </CardContent>
              </Card>}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  </div>;
};
export default ControlPanel;