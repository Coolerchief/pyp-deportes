import type { ReactNode } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminBottomNav, AdminSidebar } from './AdminNav';

/**
 * Panel frame (UI/UX §9): header on top; side bar from lg and bottom bar below it. The page
 * leaves room at the bottom on mobile so the bar never covers its last row.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gis flex min-h-svh flex-col">
      <AdminHeader />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
