import { ChevronDown, CircleAlert } from 'lucide-react';
import { type Ref, type SelectHTMLAttributes, useId } from 'react';
import { cn } from './cn';

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  label: string;
  options: readonly { value: string; label: string }[];
  /** First option with an empty value, e.g. "Elige una marca". */
  placeholder?: string;
  help?: string;
  error?: string;
  className?: string;
  ref?: Ref<HTMLSelectElement>;
};

/** Labelled native select with the look of FormField (48 px, error with icon). */
export function SelectField({
  label,
  options,
  placeholder,
  help,
  error,
  required,
  className,
  ref,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? help;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="type-small text-noche font-semibold">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'type-body text-noche h-12 w-full min-w-0 appearance-none rounded-sm border bg-blanco pr-10 pl-3',
            'focus:border-noche focus:outline-lima focus:shadow-[0_0_0_4px_var(--color-noche)] focus:outline-3 focus:outline-offset-0',
            error ? 'border-rojo-profundo border-2' : 'border-borde-control',
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="text-grafito pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
        />
      </div>
      {message && (
        <p
          id={messageId}
          className={cn(
            'type-small flex items-start gap-1',
            error ? 'text-rojo-profundo font-medium' : 'text-grafito',
          )}
        >
          {error && <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
