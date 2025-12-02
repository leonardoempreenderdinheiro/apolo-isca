import { useState, useEffect } from "react";
import { ShoppingBag } from "lucide-react";
import { UserProfileMenu } from "@/components/UserProfileMenu";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import apoloLogo from "@/assets/apolo-logo.png";

// Only show Apolo
const apoloTile = { id: "apolo", label: "Apolo" };

const Hub = () => {
  const [checkingProfile, setCheckingProfile] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleTileClick = async () => {
    if (!user) return;

    setCheckingProfile(true);
    try {
      // Check if user has a personal profile
      const { data, error } = await supabase
        .from("apolo_profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("profile_type", "personal")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking profile:", error);
        return;
      }

      // If no personal profile exists, go to create profile page
      if (!data) {
        navigate("/apolo/criar-perfil");
      } else {
        // If personal profile exists, go to dashboard
        navigate("/apolo/dashboard");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-secondary">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={apoloLogo} alt="Apolo" className="h-8" />
          </div>
          <UserProfileMenu
            onProfileClick={handleProfileClick}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-12 text-foreground">
          Boas-vindas, {user?.email?.split('@')[0] || 'Usuário'}.
        </h1>

        {/* Single Apolo Tile Full Width */}
        <div className="flex flex-col items-center gap-8 max-w-6xl mx-auto">
          <button
            onClick={handleTileClick}
            disabled={checkingProfile}
            className="group flex flex-col items-center gap-6 p-16 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <ShoppingBag className="h-16 w-16" />
            </div>
            <span className="text-2xl font-medium text-center">
              {checkingProfile ? "Carregando..." : apoloTile.label}
            </span>
          </button>

          <h2 className="text-4xl font-bold text-center text-foreground mt-4">
            Seja bem vindo à plataforma de teste do Apolo!
          </h2>
        </div>
      </main>
    </div>
  );
};

export default Hub;
