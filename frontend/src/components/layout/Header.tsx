'use client';
import { Bell, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data),
    refetchInterval: 30000,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/notifications')}
          className="relative rounded-full p-2 hover:bg-gray-100"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          {unreadData && unreadData.count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadData.count > 99 ? '99+' : unreadData.count}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role === 'admin' ? '관리자' : '협력사'}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="로그아웃">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
