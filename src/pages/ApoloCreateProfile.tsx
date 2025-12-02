import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import apoloLogo from "@/assets/apolo-logo.png";

const ApoloCreateProfile = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Por favor, insira seu nome");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("apolo_profiles")
        .insert({
          user_id: user?.id,
          profile_type: "personal",
          name: name.trim(),
        });

      if (error) throw error;

      toast.success("Perfil criado com sucesso!");
      navigate("/apolo/dashboard");
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Erro ao criar perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={apoloLogo} alt="Apolo" className="h-6 sm:h-8" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/apolo/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Crie seu Perfil Pessoal</CardTitle>
            <CardDescription>
              Para começar a usar o Apolo, primeiro precisamos conhecê-lo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Seu Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ApoloCreateProfile;
