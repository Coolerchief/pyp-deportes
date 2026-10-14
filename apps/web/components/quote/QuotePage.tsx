'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui';
import { useQuote } from '@/lib/commerce';
import { type NavLink, ROUTES } from '@/lib/navigation';
import { QuoteListStep } from './QuoteListStep';
import { StepIndicator } from './StepIndicator';

/**
 * /cotizacion (APP-FLOW §4.2): the three steps are states of one page, each one an entry of the
 * history so "atrás" goes back a step. ?paso=2 with an empty list goes back to step 1.
 */
export function QuotePage({ sports }: { sports: NavLink[] }) {
  const router = useRouter();
  const step = useSearchParams().get('paso') === '2' ? 2 : 1;
  const hydrated = useQuote((s) => s.hydrated);
  const empty = useQuote((s) => s.lines.length === 0);

  useEffect(() => {
    if (step === 2 && hydrated && empty) router.replace(ROUTES.quote);
  }, [step, hydrated, empty, router]);

  return (
    <div className="flex flex-col gap-6">
      {!(step === 1 && hydrated && empty) && <StepIndicator current={step} />}
      {step === 1 ? (
        <QuoteListStep sports={sports} onContinue={() => router.push(`${ROUTES.quote}?paso=2`)} />
      ) : (
        // Step 2 (the form) arrives in T3.5.
        <section className="flex flex-col gap-4">
          <h1 className="type-h1">Tus datos</h1>
          <div>
            <Button variant="outline" onClick={() => router.push(ROUTES.quote)}>
              Regresar a tu lista
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
