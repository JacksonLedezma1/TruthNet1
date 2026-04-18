import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { LoginDto, RegisterDto } from '../types/auth.types';

export const useAuthMutations = () => {
  const { login, register, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (data: LoginDto) => login(data),
    onSuccess: () => {
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Error al iniciar sesión',
        description: error.response?.data?.message || 'Credenciales inválidas',
        variant: 'destructive',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterDto) => register(data),
    onSuccess: () => {
      toast({
        title: 'Cuenta creada',
        description: 'Tu cuenta ha sido creada y has iniciado sesión.',
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrarte',
        description: error.response?.data?.message || 'No se pudo crear la cuenta',
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente.',
      });
      navigate('/login');
    },
  });

  return {
    loginMutation,
    registerMutation,
    logoutMutation,
  };
};
