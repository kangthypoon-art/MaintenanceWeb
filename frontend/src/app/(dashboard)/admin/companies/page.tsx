'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { companiesApi } from '@/lib/api-client';
import { getCycleLabel } from '@/lib/utils';
import { INSPECTION_CYCLES } from '@/lib/constants';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Company } from '@/types';

export default function CompanyManagementPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', code: '', inspectionCycle: 90 });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsDialogOpen(false);
      toast.success('업체가 추가되었습니다');
    },
    onError: () => toast.error('추가에 실패했습니다'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) => companiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsDialogOpen(false);
      toast.success('업체가 수정되었습니다');
    },
    onError: () => toast.error('수정에 실패했습니다'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => companiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('업체가 삭제되었습니다');
    },
    onError: () => toast.error('삭제에 실패했습니다'),
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', code: '', inspectionCycle: 90 });
    setIsDialogOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditTarget(company);
    setForm({ name: company.name, code: company.code, inspectionCycle: company.inspectionCycle });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">업체 관리</h1>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />업체 추가</Button>
        </div>
        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">불러오는 중...</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left">업체명</th>
                    <th className="pb-2 text-left">코드</th>
                    <th className="pb-2 text-left">점검주기</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2 text-gray-500">{c.code}</td>
                      <td className="py-2">{getCycleLabel(c.inspectionCycle)}</td>
                      <td className="py-2 flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate(c.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? '업체 수정' : '업체 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input label="업체명" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="업체코드" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} disabled={!!editTarget} />
            <div className="space-y-1">
              <label className="text-sm font-medium">점검주기</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.inspectionCycle}
                onChange={(e) => setForm((f) => ({ ...f, inspectionCycle: Number(e.target.value) }))}
              >
                {INSPECTION_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editTarget ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
