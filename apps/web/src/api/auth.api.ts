import apiClient from './client';
import { LoginDto, RegisterDto, AuthResponse, User } from '../types/auth.types';

export const login = async (data: LoginDto): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const register = async (data: RegisterDto): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export const getProfile = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

// Se llama automáticamente por el interceptor, pero se exporta por si acaso
export const refreshToken = async (): Promise<AuthResponse> => {
  const refreshToken = localStorage.getItem('truthnet_refresh_token');
  const response = await apiClient.post<AuthResponse>('/auth/refresh', {}, {
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  });
  return response.data;
};
