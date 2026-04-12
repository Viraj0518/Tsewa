import { api } from '../../lib/api';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(
  email: string,
  password: string,
  inviteCode?: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', {
    email,
    password,
    inviteCode,
  });
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/refresh', {
    refreshToken,
  });
  return data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}
