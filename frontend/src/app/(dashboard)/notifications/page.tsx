'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notificationsApi } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll().then((r) => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('모두 읽음 처리되었습니다');
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">알림</h1>
          <Button variant="outline" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            모두 읽음
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">불러오는 중...</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <Bell className="h-12 w-12 mb-2" />
                <p>알림이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors',
                      n.isRead ? 'bg-white' : 'bg-blue-50 hover:bg-blue-100'
                    )}
                  >
                    <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', n.isRead ? 'bg-gray-300' : 'bg-primary')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !n.isRead && 'font-medium')}>{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(n.sentAt, 'MM월 dd일 HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
