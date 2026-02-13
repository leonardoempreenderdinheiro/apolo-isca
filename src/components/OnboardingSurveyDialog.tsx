import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { GraduationCap, PiggyBank, Wallet } from 'lucide-react';

interface OnboardingSurveyDialogProps {
    open: boolean;
    userId: string;
    onComplete: () => void;
}

const ESCOLARIDADE_OPTIONS = [
    'Ensino Fundamental',
    'Ensino Médio',
    'Superior Incompleto',
    'Superior Completo',
    'Pós-graduação',
    'Mestrado',
    'Doutorado',
];

const INVESTIMENTOS_OPTIONS = [
    'Não possuo',
    'Até R$ 10.000',
    'R$ 10.001 a R$ 50.000',
    'R$ 50.001 a R$ 100.000',
    'R$ 100.001 a R$ 500.000',
    'Acima de R$ 500.000',
];

const RENDA_OPTIONS = [
    'Até R$ 3.000',
    'R$ 3.001 a R$ 5.000',
    'R$ 5.001 a R$ 10.000',
    'R$ 10.001 a R$ 20.000',
    'R$ 20.001 a R$ 50.000',
    'Acima de R$ 50.000',
];

const OnboardingSurveyDialog = ({ open, userId, onComplete }: OnboardingSurveyDialogProps) => {
    const [nivelEscolaridade, setNivelEscolaridade] = useState('');
    const [faixaInvestimentos, setFaixaInvestimentos] = useState('');
    const [faixaRendaMensal, setFaixaRendaMensal] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isFormValid = nivelEscolaridade && faixaInvestimentos && faixaRendaMensal;

    const handleSubmit = async () => {
        if (!isFormValid) {
            toast.error('Por favor, responda todas as perguntas');
            return;
        }

        setIsSubmitting(true);

        const { error } = await supabase
            .from('profiles')
            .update({
                nivel_escolaridade: nivelEscolaridade,
                faixa_investimentos: faixaInvestimentos,
                faixa_renda_mensal: faixaRendaMensal,
            })
            .eq('id', userId);

        setIsSubmitting(false);

        if (error) {
            console.error('Erro ao salvar pesquisa:', error);
            toast.error('Erro ao salvar suas respostas. Tente novamente.');
            return;
        }

        toast.success('Respostas salvas com sucesso!');
        onComplete();
    };

    return (
        <Dialog open={open}>
            <DialogContent
                className="sm:max-w-md"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-center">
                        Conte-nos mais sobre você
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Essas informações nos ajudam a personalizar sua experiência.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Nível de Escolaridade */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Qual o seu nível de escolaridade?
                        </Label>
                        <Select value={nivelEscolaridade} onValueChange={setNivelEscolaridade}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecione uma opção" />
                            </SelectTrigger>
                            <SelectContent>
                                {ESCOLARIDADE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Faixa de Investimentos */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <PiggyBank className="h-4 w-4 text-primary" />
                            Qual o valor aproximado dos seus investimentos e/ou reservas financeiras hoje?
                        </Label>
                        <Select value={faixaInvestimentos} onValueChange={setFaixaInvestimentos}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecione uma opção" />
                            </SelectTrigger>
                            <SelectContent>
                                {INVESTIMENTOS_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Faixa de Renda Mensal */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Wallet className="h-4 w-4 text-primary" />
                            Em qual faixa está sua renda mensal total líquida?
                        </Label>
                        <Select value={faixaRendaMensal} onValueChange={setFaixaRendaMensal}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecione uma opção" />
                            </SelectTrigger>
                            <SelectContent>
                                {RENDA_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSubmitting}
                    className="w-full h-11 text-sm font-semibold mt-2"
                >
                    {isSubmitting ? 'Salvando...' : 'Continuar'}
                </Button>
            </DialogContent>
        </Dialog>
    );
};

export default OnboardingSurveyDialog;
