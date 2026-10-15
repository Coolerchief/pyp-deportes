import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginPage } from '@/components/admin/LoginPage';

export const metadata: Metadata = { title: 'Entrar · Panel P&P Deportes' };

/** /admin/login (T4.1). useSearchParams (?next=, ?motivo=) suspends while prerendering. */
export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
