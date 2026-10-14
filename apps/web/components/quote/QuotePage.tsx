'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuote } from '@/lib/commerce';
import { type NavLink, ROUTES } from '@/lib/navigation';
import { QuoteFormStep } from './QuoteFormStep';
import { QuoteListStep } from './QuoteListStep';
import { StepIndicator } from './StepIndicator';

/**
 * /cotizacion (APP-FLOW §4.2): the three steps are states of one page, each one an entry of the
 * history so "atrás" goes back a step. ?paso=2 with an empty list goes back to step 1.
 */
export function QuotePage({
  sports,
  privacyVersion,
}: {
  sports: NavLink[];
  privacyVersion: string;
}) {
  const [ready, setReady] = useState(false);
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
        <>
          <QuoteFormStep privacyVersion={privacyVersion} onValid={() => setReady(true)} />
          {/* Sending (Turnstile, folio and WhatsApp) arrives in T3.6–T3.8. */}
          <p role="status" className="type-body-strong text-exito">
            {ready ? 'Tus datos están completos.' : ''}
          </p>
        </>
      )}
    </div>
  );
}
