import api from './api';
import type { AuthResponse, Company, CompanyContract, Contract, Notification, Schedule, SystemSetting, User } from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; companyId: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  withdraw: (email: string, password: string) => api.post('/auth/withdraw', { email, password }),
  checkEmail: (email: string) => api.get<{ available: boolean }>('/auth/check-email', { params: { email } }),
  getCompaniesForSignup: () => api.get<Pick<Company, 'id' | 'name' | 'code'>[]>('/auth/companies'),
  refresh: (refreshToken: string) => api.post<AuthResponse>('/auth/refresh', { refreshToken }),
};

export const schedulesApi = {
  getAll: (params?: { year?: number; month?: number; companyId?: number; engineerId?: number }) =>
    api.get<Schedule[]>('/schedules', { params }),
  getOne: (id: number) => api.get<Schedule>(`/schedules/${id}`),
  create: (data: Partial<Schedule>) => api.post<Schedule>('/schedules', data),
  update: (id: number, data: Partial<Schedule>) => api.put<Schedule>(`/schedules/${id}`, data),
  delete: (id: number) => api.delete(`/schedules/${id}`),
  getAvailableSlots: (date: string) =>
    api.get<{ pcNumber: number; available: boolean }[]>('/schedules/available-slots', { params: { date } }),
};

export const companiesApi = {
  getAll: () => api.get<Company[]>('/companies'),
  getOne: (id: number) => api.get<Company>(`/companies/${id}`),
  create: (data: Partial<Company>) => api.post<Company>('/companies', data),
  update: (id: number, data: Partial<Company>) => api.put<Company>(`/companies/${id}`, data),
  delete: (id: number) => api.delete(`/companies/${id}`),
  getUnregistered: () => api.get<Company[]>('/companies/unregistered'),
};

export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getEngineers: () => api.get<User[]>('/users/engineers'),
  create: (data: Partial<User>) => api.post<User>('/users', data),
  update: (id: number, data: Partial<User>) => api.put<User>(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export const contractsApi = {
  getByCompany: (companyId: number) => api.get<Contract[]>(`/contracts/company/${companyId}`),
  create: (data: Partial<Contract>) => api.post<Contract>('/contracts', data),
  update: (id: number, data: Partial<Contract>) => api.put<Contract>(`/contracts/${id}`, data),
  delete: (id: number) => api.delete(`/contracts/${id}`),
};

export const companyContractsApi = {
  getByCode: (code: string) => api.get<CompanyContract[]>(`/company-contracts/${code}`),
  create: (code: string, data: Partial<CompanyContract>) =>
    api.post<CompanyContract>(`/company-contracts/${code}`, data),
  update: (id: number, data: Partial<CompanyContract>) =>
    api.put<CompanyContract>(`/company-contracts/${id}`, data),
  delete: (id: number) => api.delete(`/company-contracts/${id}`),
};

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications'),
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const excelApi = {
  export: (params: { year: number; month?: number; companyId?: string }) =>
    api.get('/excel/export', { params, responseType: 'blob' }),
};

export const settingsApi = {
  getAll: () => api.get<Record<string, string>>('/settings'),
  get: (key: string) => api.get<SystemSetting>(`/settings/${key}`),
  update: (key: string, value: string, memo?: string) =>
    api.put<SystemSetting>(`/settings/${key}`, { value, memo }),
};
