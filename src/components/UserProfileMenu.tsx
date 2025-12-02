import { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";

interface UserProfileMenuProps {
  onProfileClick: () => void;
}

export const UserProfileMenu = ({ onProfileClick }: UserProfileMenuProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name || user.email?.split('@')[0] || 'Usuário');
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const getInitials = () => {
    if (!userName) return 'U';
    return userName.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} alt={userName} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-medium">{userName}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Meu Perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="cursor-pointer text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do sistema</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
