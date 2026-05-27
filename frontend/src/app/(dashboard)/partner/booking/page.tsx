'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { schedulesApi, companyContractsApi, companiesApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STEPS = ['날짜 선택', '시간 입력', 'PC 배정', '확인'];

export default function BookingWizardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    startTime: '09:00',
    endTime: '18:00',
    autoAssign: true,
    pcNumber: 1,
    engineerId: user?.id as number | undefined,
    companyContractId: '',
  });

  const { data: availableSlots = [] } = useQuery({
    queryKey: ['available-slots', formData.date],
    queryFn: () => schedulesApi.getAvailableSlots(formData.date).then((r) => r.data),
    enabled: step === 2 && !formData.autoAssign,
  });

  // company.code를 가져온 뒤 company-contracts 조회 (API는 code 기반)
  const { data: company } = useQuery({
    queryKey: ['company', user?.companyId],
    queryFn: () => companiesApi.getOne(user!.companyId!).then((r) => r.data),
    enabled: !!user?.companyId,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['company-contracts', company?.code],
    queryFn: () => companyContractsApi.getByCode(company?.code || '').then((r) => r.data),
    enabled: !!company?.code,
  });

  const mutation = useMutation({
    mutationFn: () =>
      schedulesApi.create({
        companyId: user?.companyId ?? undefined,
        engineerId: formData.engineerId,
        date: formData.date,
        endDate: formData.endDate || undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        pcNumber: formData.pcNumber,
        companyContractId: formData.companyContractId ? Number(formData.companyContractId) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('일정이 등록되었습니다');
      router.push('/partner/schedule');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '일정 등록에 실패했습니다');
    },
  });

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <Input id="date" label="시작일" type="date" value={formData.date}
              onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))} />
            <Input id="endDate" label="종료일 (다일 점검, 선택)" type="date" value={formData.endDate}
              onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))} />
            {contracts.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">계약 (선택)</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.companyContractId}
                  onChange={(e) => setFormData((f) => ({ ...f, companyContractId: e.target.value }))}>
                  <option value="">선택 안 함</option>
                  {contracts.map((c) => <option key={c.id} value={String(c.id)}>{c.contractName}</option>)}
                </select>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <Input id="startTime" label="시작 시간 (HH:MM)" type="time" value={formData.startTime}
              onChange={(e) => setFormData((f) => ({ ...f, startTime: e.target.value }))} />
            <Input id="endTime" label="종료 시간 (HH:MM)" type="time" value={formData.endTime}
              onChange={(e) => setFormData((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="autoAssign" checked={formData.autoAssign}
                onChange={(e) => setFormData((f) => ({ ...f, autoAssign: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300" />
              <label htmlFor="autoAssign" className="text-sm font-medium">자동 PC 배정</label>
            </div>
            {!formData.autoAssign && (
              <div className="space-y-1">
                <label className="text-sm font-medium">PC 번호 선택</label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const slot = availableSlots.find((s) => s.pcNumber === n);
                    const isAvailable = !slot || slot.available;
                    return (
                      <button key={n} disabled={!isAvailable}
                        onClick={() => setFormData((f) => ({ ...f, pcNumber: n }))}
                        className={`w-14 h-14 rounded-lg border-2 font-bold text-lg transition-colors ${
                          formData.pcNumber === n ? 'border-primary bg-primary text-white' :
                          !isAvailable ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' :
                          'border-gray-300 hover:border-primary'
                        }`}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <h3 className="font-medium">등록 내용 확인</h3>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">날짜</span>
                <span>{formData.date}{formData.endDate && ` ~ ${formData.endDate}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">시간</span>
                <span>{formData.startTime} ~ {formData.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PC 배정</span>
                <span>{formData.autoAssign ? '자동' : `PC ${formData.pcNumber}`}</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold">일정 등록</h1>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i === step ? 'bg-primary text-white' :
                i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>{i + 1}</div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-8 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>이전</Button>}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>다음</Button>
          ) : (
            <Button className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? '등록 중...' : '일정 등록'}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
