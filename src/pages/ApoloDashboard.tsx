import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, User, Users, Plus, Trash2 } from "lucide-react";
import apoloLogo from "@/assets/apolo-logo.png";
import { UserProfileMenu } from "@/components/UserProfileMenu";

interface ApoloProfile {
  id: string;
  name: string;
  age?: number;
  relationship?: string;
  profile_type: "personal" | "dependent";
}

const ApoloDashboard = () => {
  const [personalProfile, setPersonalProfile] = useState<ApoloProfile | null>(null);
  const [dependents, setDependents] = useState<ApoloProfile[]>([]);
  const [studiesMap, setStudiesMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showAddDependent, setShowAddDependent] = useState(false);


  // Form state for new dependent
  const [newDependent, setNewDependent] = useState({
    name: "",
    age: "",
    relationship: "",
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfiles();
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;

    try {
      // Carregar perfis
      const { data: profilesData, error: profilesError } = await supabase
        .from("apolo_profiles")
        .select("*")
        .eq("user_id", user.id);

      if (profilesError) throw profilesError;

      const personal = profilesData.find((p) => p.profile_type === "personal");
      const deps = profilesData.filter((p) => p.profile_type === "dependent");

      setPersonalProfile(personal || null);
      setDependents(deps);

      // Carregar estudos para verificar quais perfis já têm estudo
      const { data: studiesData, error: studiesError } = await supabase
        .from("financial_studies")
        .select("profile_id, client_id")
        .eq("consultant_id", user.id);

      if (studiesError) throw studiesError;

      // Criar mapa de estudos existentes
      const studies: Record<string, boolean> = {};
      studiesData?.forEach((study) => {
        if (study.profile_id) studies[study.profile_id] = true;
        if (study.client_id) studies[study.client_id] = true;
      });
      setStudiesMap(studies);

    } catch (error) {
      console.error("Error loading profiles:", error);
      toast.error("Erro ao carregar perfis");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (dependents.length >= 4) {
      toast.error("Você já atingiu o limite de 4 dependentes");
      return;
    }

    if (!newDependent.name.trim() || !newDependent.age || !newDependent.relationship) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { error } = await supabase.from("apolo_profiles").insert({
        user_id: user?.id,
        profile_type: "dependent",
        name: newDependent.name.trim(),
        age: parseInt(newDependent.age),
        relationship: newDependent.relationship,
      });

      if (error) throw error;

      toast.success("Dependente adicionado com sucesso!");
      setShowAddDependent(false);
      setNewDependent({ name: "", age: "", relationship: "" });
      loadProfiles();
    } catch (error) {
      console.error("Error adding dependent:", error);
      toast.error("Erro ao adicionar dependente");
    }
  };

  const handleDeleteDependent = async (id: string) => {
    try {
      const { error } = await supabase
        .from("apolo_profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Dependente removido com sucesso!");
      loadProfiles();
    } catch (error) {
      console.error("Error deleting dependent:", error);
      toast.error("Erro ao remover dependente");
    }
  };

  const handleViewPlanning = (profileId: string) => {
    navigate(`/apolo/painel?profileId=${profileId}`);
  };



  const handleProfileClick = () => {
    navigate("/profile");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={apoloLogo} alt="Apolo" className="h-6 sm:h-8" />
          </div>
          <UserProfileMenu
            onProfileClick={handleProfileClick}
          />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Dashboard Apolo
          </h1>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Personal Profile Card */}
          {personalProfile && (
            <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => handleViewPlanning(personalProfile.id)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">{personalProfile.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Perfil Pessoal</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full text-sm sm:text-base">
                  {studiesMap[personalProfile.id] ? "Visualizar Estudo" : "Monte seu estudo"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Dependent Cards */}
          {dependents.map((dependent) => (
            <Card key={dependent.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base">{dependent.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {dependent.relationship} • {dependent.age} anos
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDependent(dependent.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full text-sm sm:text-base" onClick={() => handleViewPlanning(dependent.id)}>
                  {studiesMap[dependent.id] ? "Visualizar Estudo" : "Monte seu estudo"}
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Add Dependent Card */}
          {dependents.length < 4 && (
            <Dialog open={showAddDependent} onOpenChange={setShowAddDependent}>
              <DialogTrigger asChild>
                <Card className="hover:border-primary transition-colors cursor-pointer border-dashed">
                  <CardHeader>
                    <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <CardTitle className="text-sm sm:text-base">Adicionar Dependente</CardTitle>
                      <CardDescription className="mt-2 text-xs sm:text-sm">
                        {dependents.length}/4 dependentes cadastrados
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Dependente</DialogTitle>
                  <DialogDescription>
                    Adicione as informações do seu dependente
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddDependent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dep-name">Nome Completo</Label>
                    <Input
                      id="dep-name"
                      value={newDependent.name}
                      onChange={(e) => setNewDependent({ ...newDependent, name: e.target.value })}
                      placeholder="Digite o nome do dependente"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dep-age">Idade</Label>
                    <Input
                      id="dep-age"
                      type="number"
                      min="0"
                      max="150"
                      value={newDependent.age}
                      onChange={(e) => setNewDependent({ ...newDependent, age: e.target.value })}
                      placeholder="Digite a idade"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dep-relationship">Parentesco</Label>
                    <Select
                      value={newDependent.relationship}
                      onValueChange={(value) => setNewDependent({ ...newDependent, relationship: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Filho(a)">Filho(a)</SelectItem>
                        <SelectItem value="Cônjuge">Cônjuge</SelectItem>
                        <SelectItem value="Pai/Mãe">Pai/Mãe</SelectItem>
                        <SelectItem value="Irmão(ã)">Irmão(ã)</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Adicionar Dependente
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </div>
  );
};

export default ApoloDashboard;
