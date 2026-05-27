export type Role = 'admin' | 'partner';
export type ScheduleStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  companyId: number | null;
  phone?: string;
  isDeleted: boolean;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  inspectionCycle: number; // 일 단위 (30=월별, 90=분기별, 180=반기, 365=연간)
  createdAt: string;
  updatedAt: string;
  contracts?: Contract[];
  companyContracts?: CompanyContract[];
}

export interface Schedule {
  id: number;
  companyId: number;
  engineerId: number;
  companyContractId?: number | null;
  companyName: string;
  engineerName: string;
  contractName?: string | null;
  inspectionLocation?: string | null;
  date: string;
  endDate?: string | null;
  startTime: string; // "HH:MM" 형식
  endTime: string;   // "HH:MM" 형식
  status: ScheduleStatus;
  pcNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: number;
  companyId: number;
  contractName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface CompanyContract {
  id: number;
  code: string;
  seq: number;
  contractName: string;
  inspectionLocation?: string;
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  type: string;
  isRead: boolean;
  sentAt: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  memo?: string;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user: User;
}

export interface AvailableSlot {
  pcNumber: number;
  available: boolean;
}
