'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Company } from '@/types';

const schema = z.object({
  name: z.string().min(2, '이름을 입력하세요'),
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  phone: z.string().optional(),
  companyId: z.string().min(1, '협력사를 선택하세요'),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Pick<Company, 'id' | 'name' | 'code'>[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    authApi.getCompaniesForSignup().then((r) => setCompanies(r.data)).catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authApi.register(data);
      toast.success('회원가입 완료! 로그인하세요.');
      router.push('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">회원가입</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input id="name" label="이름" placeholder="홍길동" error={errors.name?.message} {...register('name')} />
            <Input id="email" label="이메일" type="email" error={errors.email?.message} {...register('email')} />
            <Input id="phone" label="전화번호 (선택)" type="tel" placeholder="01012345678" error={errors.phone?.message} {...register('phone')} />
            <Input id="password" label="비밀번호" type="password" error={errors.password?.message} {...register('password')} />
            <div className="space-y-1">
              <label htmlFor="companyId" className="text-sm font-medium">협력사</label>
              <select id="companyId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register('companyId')}>
                <option value="">협력사 선택</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
              {errors.companyId && <p className="text-xs text-destructive">{errors.companyId.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '처리 중...' : '회원가입'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary hover:underline">로그인</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
