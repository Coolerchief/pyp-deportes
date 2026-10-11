import { CircleAlert } from 'lucide-react';
import { type InputHTMLAttributes, type Ref, type TextareaHTMLAttributes, useId } from 'react';
import { cx } from '@/lib/cx';

type BaseProps = {
  label: string;
  name: string;
  /** Hint under the field; the error replaces it. */
  help?: string;
  /** Error message; shown with an icon and announced through aria-describedby. */
  error?: string;
  required?: boolean;
  /** Fixed text before the input, e.g. "+52" for WhatsApp. */
  prefix?: string;
  className?: string;
};

type InputFieldProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'required' | 'prefix' | 'className'> & {
    multiline?: false;
    ref?: Ref<HTMLInputElement>;
  };

type TextareaFieldProps = BaseProps &
  Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'name' | 'required' | 'prefix' | 'className'
  > & {
    multiline: true;
    ref?: Ref<HTMLTextAreaElement>;
  };

export type FormFieldProps = InputFieldProps | TextareaFieldProps;

const CONTROL =
  'type-body text-noche bg-blanco placeholder:text-grafito-suave w-full min-w-0 rounded-sm border px-3 ' +
  'focus:border-noche focus:outline-3 focus:outline-offset-0 focus:outline-lima focus:shadow-[0_0_0_4px_var(--color-noche)]';

/** Labelled form control (UI/UX §7.6): label above, 48 px input, help or error below. */
export function FormField(props: FormFieldProps) {
  const { label, name, help, error, required, prefix, className, multiline, ref, ...rest } = props;
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? help;

  const shared = {
    id,
    name,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': message ? messageId : undefined,
    className: cx(
      CONTROL,
      error ? 'border-rojo-profundo border-2' : 'border-borde-control',
      prefix && 'rounded-l-none',
      multiline ? 'min-h-28 resize-y py-3' : 'h-12',
    ),
  };

  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="type-small text-noche font-semibold">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="flex">
        {prefix && (
          <span className="bg-gis border-borde-control text-noche flex items-center rounded-l-sm border border-r-0 px-3 font-semibold">
            {prefix}
          </span>
        )}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...shared}
            ref={ref as Ref<HTMLTextAreaElement>}
          />
        ) : (
          <input
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            {...shared}
            ref={ref as Ref<HTMLInputElement>}
          />
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={cx(
            'type-small flex items-start gap-1',
            error ? 'text-rojo-profundo font-medium' : 'text-grafito-suave',
          )}
        >
          {error && <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
