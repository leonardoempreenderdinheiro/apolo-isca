import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import apoloLogo from '@/assets/apolo-logo.png';

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione uma imagem válida',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 2MB',
          variant: 'destructive',
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (newPassword !== confirmPassword) {
        toast({
          title: 'Erro',
          description: 'As senhas não coincidem',
          variant: 'destructive',
        });
        return;
      }

      if (newPassword.length < 6) {
        toast({
          title: 'Erro',
          description: 'A senha deve ter pelo menos 6 caracteres',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (!fullName) return 'U';
    return fullName.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-secondary">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/apolo/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={apoloLogo} alt="Apolo" className="h-8" />
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-8 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground">
              Gerencie suas informações pessoais e preferências
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>
                Adicione uma foto para personalizar seu perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Upload className="h-4 w-4" />
                      Escolher nova foto
                    </div>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={loading}
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG ou WEBP (max. 2MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações básicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={loading}>
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={loading || !newPassword || !confirmPassword}
                variant="secondary"
              >
                <Lock className="mr-2 h-4 w-4" />
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
