'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { settingsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [maxPc, setMaxPc] = useState('5');
  const [startHour, setStartHour] = useState('9');
  const [endHour, setEndHour] = useState('18');
  const [d7Alarm, setD7Alarm] = useState('true');

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then((r) => r.data),
  });

  useEffect(() => {
    if (settings && typeof settings === 'object') {
      if (settings.MAX_PC_COUNT) setMaxPc(settings.MAX_PC_COUNT);
      if (settings.START_HOUR) setStartHour(settings.START_HOUR);
      if (settings.END_HOUR) setEndHour(settings.END_HOUR);
      if (settings.D7_ALARM) setD7Alarm(settings.D7_ALARM);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      await settingsApi.update('MAX_PC_COUNT', maxPc);
      await settingsApi.update('START_HOUR', startHour);
      await settingsApi.update('END_HOUR', endHour);
      await settingsApi.update('D7_ALARM', d7Alarm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('설정이 저장되었습니다');
    },
    onError: () => toast.error('저장에 실패했습니다'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">시스템 설정</h1>
        <Card className="max-w-lg">
          <CardHeader><CardTitle>설정 관리</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input id="maxPc" label="일일 최대 PC 대수" type="number" min={1} max={20} value={maxPc}
              onChange={(e) => setMaxPc(e.target.value)} />
            <Input id="startHour" label="점검 시작 시간 (시)" type="number" min={0} max={23} value={startHour}
              onChange={(e) => setStartHour(e.target.value)} />
            <Input id="endHour" label="점검 종료 시간 (시)" type="number" min={0} max={23} value={endHour}
              onChange={(e) => setEndHour(e.target.value)} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="d7Alarm" checked={d7Alarm === 'true'}
                onChange={(e) => setD7Alarm(e.target.checked ? 'true' : 'false')}
                className="h-4 w-4 rounded border-gray-300" />
              <label htmlFor="d7Alarm" className="text-sm font-medium">D-7 알림 활성화</label>
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? '저장 중...' : '설정 저장'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
