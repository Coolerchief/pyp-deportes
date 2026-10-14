'use client';

import { type QuoteRequester, quoteTotals } from '@pyp/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { quoteItems, track } from '@/lib/analytics/track';
import { useCatalog } from '@/lib/catalog-client';
import { useQuote } from '@/lib/commerce';
import { type LastQuote, loadLastQuote, sentParam, useSubmission } from '@/lib/commerce/submission';
import { sendQuote, submitQuoteEndpoint, turnstileSiteKey } from '@/lib/commerce/submit-quote';
import { useTurnstile } from '@/lib/commerce/turnstile';
import { type NavLink, ROUTES } from '@/lib/navigation';
import { QuoteConfirmation } from './QuoteConfirmation';
import { QuoteFormStep } from './QuoteFormStep';
import { QuoteListStep } from './QuoteListStep';
import { StepIndicator } from './StepIndicator';

export const OFFLINE_MESSAGE =
  'Sin conexión. Tu lista está guardada: inténtalo de nuevo cuando tengas señal.';

const SHELL = 'container-page pt-4 pb-16 lg:pt-8 lg:pb-20';

/** Step 3: the send saved in this session that matches ?enviada=, or back to step 1. */
function SentStep({ param }: { param: string }) {
  const router = useRouter();
  const inMemory = useSubmission((s) => s.last);
  const [last, setLast] = useState<LastQuote | null | undefined>(undefined);

  useEffect(() => {
    const fromMemory = inMemory && sentParam(inMemory.folio) === param ? inMemory : null;
    const found = fromMemory ?? loadLastQuote(param);
    // sessionStorage is only readable after the static render.
    void Promise.resolve().then(() => setLast(found));
    if (!found) router.replace(ROUTES.quote);
  }, [param, inMemory, router]);

  if (!last) return <div className="min-h-[calc(100svh-64px)] bg-noche" aria-busy="true" />;
  return <QuoteConfirmation last={last} />;
}

/**
 * /cotizacion (APP-FLOW §4.2): the three steps are states of one page, each one an entry of the
 * history so "atrás" goes back a step. ?paso=2 with an empty list goes back to step 1, and
 * ?enviada= shows the confirmation of the last send.
 */
export function QuotePage({
  sports,
  privacyVersion,
  whatsappNumber,
}: {
  sports: NavLink[];
  privacyVersion: string;
  whatsappNumber: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const sent = params.get('enviada');
  const step = params.get('paso') === '2' ? 2 : 1;
  const hydrated = useQuote((s) => s.hydrated);
  const empty = useQuote((s) => s.lines.length === 0);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const onForm = !sent && step === 2;
  const { container, takeToken } = useTurnstile(onForm ? turnstileSiteKey() : null);
  // Variant SKUs for the message; the send never waits for it.
  const { catalog } = useCatalog(onForm);

  useEffect(() => {
    if (onForm && hydrated && empty) router.replace(ROUTES.quote);
  }, [onForm, hydrated, empty, router]);

  // The idempotency key is made on entering step 2 (APP-FLOW §4.3).
  useEffect(() => {
    if (onForm) useSubmission.getState().ensureRequestId();
  }, [onForm]);

  async function send(requester: QuoteRequester) {
    if (sending) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setNotice(OFFLINE_MESSAGE);
      return;
    }
    setNotice(null);
    setSending(true);
    const submission = useSubmission.getState();
    const lines = useQuote.getState().lines;
    const { result, waUrl } = await sendQuote({
      lines,
      requester,
      catalog,
      whatsappNumber,
      clientRequestId: submission.ensureRequestId(),
      endpoint: submitQuoteEndpoint(),
      takeToken,
    });
    setSending(false);

    if (result.kind === 'saved') {
      track('submit_quote', {
        folio: result.folio,
        items: quoteItems(lines),
        ...quoteTotals(lines),
        customer_type: requester.customer.type,
      });
    } else {
      track('quote_submit_error', {
        reason: result.kind === 'invalid_items' ? 'invalid_items' : result.reason,
      });
    }

    if (result.kind === 'invalid_items' || !waUrl) {
      // Back to the list with the product marked: it has to be removed first.
      submission.setRejected(result.kind === 'invalid_items' ? result.variantIds : []);
      router.push(ROUTES.quote);
      return;
    }
    const folio = result.kind === 'saved' ? result.folio : null;
    if (folio) submission.renewRequestId();
    // The confirmation opens WhatsApp once it is on screen.
    submission.setLast({ folio, waUrl }, true);
    router.push(`${ROUTES.quote}?enviada=${encodeURIComponent(sentParam(folio))}`);
  }

  if (sent) return <SentStep param={sent} />;

  return (
    <div className={SHELL}>
      <div className="flex flex-col gap-6">
        {!(step === 1 && hydrated && empty) && <StepIndicator current={step} />}
        {step === 1 ? (
          <QuoteListStep
            sports={sports}
            onContinue={() => {
              const lines = useQuote.getState().lines;
              track('begin_quote_form', { items: quoteItems(lines), ...quoteTotals(lines) });
              router.push(`${ROUTES.quote}?paso=2`);
            }}
          />
        ) : (
          <>
            <QuoteFormStep
              privacyVersion={privacyVersion}
              onValid={send}
              sending={sending}
              notice={notice}
            />
            {/* Turnstile shows here only if Cloudflare needs the visitor to interact. */}
            <div ref={container} className="empty:hidden" />
          </>
        )}
      </div>
    </div>
  );
}
