'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createQuoteRequesterSchema,
  CUSTOMER_TYPES,
  customerTypeLabels,
  DELIVERY_METHODS,
  deliveryMethodLabels,
  mexicoCityDate,
  NEEDED_BY_SHORTCUTS,
  neededByDate,
  type QuoteField,
  quoteErrorSummary,
  type QuoteRequester,
  type QuoteRequesterInput,
  requesterDraft,
} from '@pyp/shared';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { type FieldErrors, useForm, useWatch } from 'react-hook-form';
import { useEffect, useMemo, useRef, useState } from 'react';
import { chipStyle } from '@/components/catalog/chip-style';
import { FormField } from '@/components/ui';
import { loadRequester, saveRequester } from '@/lib/commerce/requester-storage';
import { cx } from '@/lib/cx';
import { ROUTES } from '@/lib/navigation';

type QuoteFormProps = {
  id: string;
  privacyVersion: string;
  /** Called with the validated data: QuotePage sends it (T3.8). */
  onValid: (values: QuoteRequester) => void;
};

const DEFAULTS = {
  customer: { name: '', phone: '', type: 'league_team', organization: '' },
  neededBy: '',
  deliveryMethod: 'pickup',
  requiresInvoice: false,
  note: '',
  privacyAccepted: false,
} as const;

/** Which form fields have an error, in the shape quoteErrorSummary expects. */
function errorFields(errors: FieldErrors<QuoteRequesterInput>): QuoteField[] {
  const fields: [QuoteField, unknown][] = [
    ['name', errors.customer?.name],
    ['phone', errors.customer?.phone],
    ['type', errors.customer?.type],
    ['organization', errors.customer?.organization],
    ['neededBy', errors.neededBy],
    ['deliveryMethod', errors.deliveryMethod],
    ['note', errors.note],
    ['privacyAccepted', errors.privacyAccepted],
  ];
  return fields.filter(([, error]) => error).map(([field]) => field);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="type-small text-rojo-profundo flex items-start gap-1 font-medium">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

const LEGEND = 'type-small text-noche mb-1.5 font-semibold';

/**
 * QuoteForm (UI/UX §7.6, step 2): the requester's data with the shared Zod schema. Submitting
 * with errors shows the summary ("Faltan 3 datos…") with the focus and a message under each
 * field; a field's error clears as soon as it is corrected. Data of a previous request is
 * prefilled, and saved again (without the privacy box) after a valid submission.
 */
export function QuoteForm({ id, privacyVersion, onValid }: QuoteFormProps) {
  const schema = useMemo(() => createQuoteRequesterSchema(), []);
  const summary = useRef<HTMLDivElement>(null);
  // Each failed submission moves the focus to the summary, so screen readers hear what is missing.
  // The errors reach formState a render later, so the focus waits until the summary exists.
  const [failedAttempts, setFailedAttempts] = useState(0);
  const focusedAttempt = useRef(0);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitted },
  } = useForm<QuoteRequesterInput, unknown, QuoteRequester>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULTS, privacyVersion } as unknown as QuoteRequesterInput,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // The focus goes to the error summary (UI/UX §7.6), not to the first invalid field.
    shouldFocusError: false,
  });

  // Prefill with the data of a previous request (APP-FLOW §4.2).
  useEffect(() => {
    const draft = loadRequester();
    if (Object.keys(draft).length === 0) return;
    reset({
      ...DEFAULTS,
      privacyVersion,
      customer: {
        ...DEFAULTS.customer,
        name: draft.name ?? '',
        phone: draft.phone ?? '',
        type: draft.type ?? DEFAULTS.customer.type,
        organization: draft.organization ?? '',
      },
      deliveryMethod: draft.deliveryMethod ?? DEFAULTS.deliveryMethod,
      requiresInvoice: draft.requiresInvoice ?? false,
    } as unknown as QuoteRequesterInput);
  }, [reset, privacyVersion]);

  const type = useWatch({ control, name: 'customer.type' });
  const neededBy = useWatch({ control, name: 'neededBy' });
  const requiresInvoice = useWatch({ control, name: 'requiresInvoice' });
  const individual = type === 'individual';
  const today = mexicoCityDate();
  const fields = errorFields(errors);
  // "Faltan 3 datos para enviar tu cotización: nombre, WhatsApp y aviso de privacidad." with the
  // lead in bold, as in the design.
  const [summaryLead, summaryRest] = quoteErrorSummary(fields).split(': ');
  const showSummary = isSubmitted && fields.length > 0;
  useEffect(() => {
    if (showSummary && failedAttempts > focusedAttempt.current && summary.current) {
      focusedAttempt.current = failedAttempts;
      summary.current.focus();
    }
  }, [failedAttempts, showSummary]);

  function submit(values: QuoteRequester) {
    saveRequester(requesterDraft(values as unknown as QuoteRequesterInput));
    onValid(
      individual
        ? { ...values, customer: { ...values.customer, organization: undefined } }
        : values,
    );
  }

  const err = (path: string) => `${id}-${path}-error`;

  return (
    <form
      id={id}
      noValidate
      onSubmit={handleSubmit(submit, () => setFailedAttempts((n) => n + 1))}
      className="flex flex-col gap-5"
    >
      {showSummary && (
        <div
          ref={summary}
          role="alert"
          tabIndex={-1}
          className="border-rojo-profundo flex items-start gap-2.5 border-2 p-3"
        >
          <CircleAlert aria-hidden="true" className="text-rojo-profundo mt-0.5 size-5 shrink-0" />
          <p className="type-small">
            <b>{summaryLead}:</b> {summaryRest}
          </p>
        </div>
      )}

      <FormField
        label="Nombre"
        required
        autoComplete="name"
        placeholder="Cómo te llamamos"
        error={errors.customer?.name?.message}
        {...register('customer.name')}
      />
      <FormField
        label="WhatsApp"
        required
        prefix="+52"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="10 dígitos"
        help="Aquí te mandamos la cotización."
        error={errors.customer?.phone?.message}
        {...register('customer.phone')}
      />

      <fieldset aria-describedby={errors.customer?.type ? err('type') : undefined}>
        <legend className={LEGEND}>
          Soy… <span aria-hidden="true">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_TYPES.map((value) => {
            const { className, style } = chipStyle(type === value);
            return (
              <label key={value} className="focus-placa inline-flex cursor-pointer">
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register('customer.type')}
                />
                <span className={className} style={style}>
                  {customerTypeLabels[value]}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError id={err('type')} message={errors.customer?.type?.message} />
      </fieldset>

      {!individual && (
        <FormField
          label="Nombre del equipo o institución"
          autoComplete="organization"
          placeholder="Ej. Liga de fútbol infantil"
          error={errors.customer?.organization?.message}
          {...register('customer.organization')}
        />
      )}

      <div className="flex flex-col gap-2">
        <FormField
          label="¿Para cuándo lo necesitas?"
          required
          type="date"
          min={today}
          help="Entre más tiempo, mejor podemos cumplir."
          error={errors.neededBy?.message}
          {...register('neededBy')}
        />
        <div role="group" aria-label="Atajos de fecha" className="flex flex-wrap gap-2">
          {NEEDED_BY_SHORTCUTS.map((shortcut) => {
            const date = neededByDate(shortcut.days);
            const active = neededBy === date;
            const { className, style } = chipStyle(active);
            return (
              <span
                key={shortcut.days}
                className={active ? 'focus-placa inline-flex' : 'inline-flex'}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  style={style}
                  className={className}
                  onClick={() =>
                    setValue('neededBy', date, { shouldValidate: isSubmitted, shouldDirty: true })
                  }
                >
                  {shortcut.label}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      <fieldset>
        <legend className={LEGEND}>Entrega</legend>
        <div className="flex flex-col gap-1">
          {DELIVERY_METHODS.map((value) => (
            <label
              key={value}
              className="type-body flex min-h-11 cursor-pointer items-center gap-3"
            >
              <input
                type="radio"
                value={value}
                className="accent-noche size-5"
                {...register('deliveryMethod')}
              />
              {deliveryMethodLabels[value]}
            </label>
          ))}
        </div>
        <FieldError id={err('delivery')} message={errors.deliveryMethod?.message} />
      </fieldset>

      <fieldset>
        <legend className={LEGEND}>¿Requieres factura?</legend>
        <div className="flex gap-6">
          {[
            ['Sí', true],
            ['No', false],
          ].map(([label, value]) => (
            <label
              key={String(value)}
              className="type-body flex min-h-11 cursor-pointer items-center gap-3"
            >
              <input
                type="radio"
                name="requiresInvoice"
                checked={requiresInvoice === value}
                onChange={() =>
                  setValue('requiresInvoice', value as boolean, { shouldDirty: true })
                }
                className="accent-noche size-5"
              />
              {label as string}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField
        label="Nota general"
        multiline
        placeholder="Colores del club, dudas, lo que necesites decirnos"
        error={errors.note?.message}
        {...register('note')}
      />

      <div className="flex flex-col gap-1">
        <label className="type-body flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            aria-invalid={errors.privacyAccepted ? true : undefined}
            aria-describedby={errors.privacyAccepted ? err('privacy') : undefined}
            className={cx(
              'accent-noche mt-0.5 size-5 shrink-0',
              errors.privacyAccepted &&
                'outline-rojo-profundo outline-2 outline-offset-2 outline-solid',
            )}
            {...register('privacyAccepted')}
          />
          <span>
            Acepto el{' '}
            <Link
              href={ROUTES.privacy}
              target="_blank"
              className="text-rojo-profundo font-semibold"
            >
              aviso de privacidad
            </Link>{' '}
            <span aria-hidden="true">*</span>
          </span>
        </label>
        <FieldError id={err('privacy')} message={errors.privacyAccepted?.message} />
      </div>
    </form>
  );
}
