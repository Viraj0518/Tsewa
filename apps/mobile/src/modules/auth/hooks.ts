import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from './store';
import { loginUser, registerUser, logoutUser } from './api';
import { clearAllTokens } from '../../lib/storage';
import { disconnectSocket } from '../../lib/socket';

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  inviteCode?: string;
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async ({ email, password }: LoginParams) => {
      return loginUser(email, password);
    },
    onSuccess: (data) => {
      login(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user
      );
    },
  });
}

export function useRegister() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async ({ email, password, inviteCode }: RegisterParams) => {
      return registerUser(email, password, inviteCode);
    },
    onSuccess: (data) => {
      login(
        { accessToken: data.accessToken, refreshToken: data.refreshToken },
        data.user
      );
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      try {
        await logoutUser();
      } catch {
        // Logout even if API call fails
      }
    },
    onSettled: async () => {
      disconnectSocket();
      await clearAllTokens();
      logout();
    },
  });
}
