import { neededByDate, REQUESTER_STORAGE_KEY } from '@pyp/shared';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuoteForm } from './QuoteForm';

function setup() {
  const onValid = vi.fn();
  const view = render(
    <>
      <QuoteForm id="form" privacyVersion="2026-10" onValid={onValid} />
      <button type="submit" form="form">
        Enviar
      </button>
    </>,
  );
  return { onValid, ...view };
}

beforeEach(() => window.localStorage.clear());

describe('QuoteForm', () => {
  it('sums up what is missing, puts the focus there and marks each field', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('textbox', { name: /WhatsApp/ }), '55 1234 56');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    const summary = await screen.findByRole('alert', { name: '' });
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent(
      'Faltan 4 datos para enviar tu cotización: nombre, WhatsApp, fecha y aviso de privacidad.',
    );
    const name = screen.getByRole('textbox', { name: /Nombre\s*\*?$/ });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Escribe tu nombre.');
    expect(screen.getByRole('textbox', { name: /WhatsApp/ })).toHaveAccessibleDescription(
      'Faltan dígitos: deben ser 10.',
    );
    expect(
      screen.getByRole('checkbox', { name: /aviso de privacidad/ }),
    ).toHaveAccessibleDescription('Acepta el aviso de privacidad para enviar.');
  });

  it('clears a field error as soon as it is corrected', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.type(screen.getByRole('textbox', { name: /Nombre\s*\*?$/ }), 'Ana López');
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /Nombre\s*\*?$/ })).not.toHaveAttribute(
        'aria-invalid',
      ),
    );
    expect(screen.getByText(/^Faltan 3 datos/).closest('[role="alert"]')).toHaveTextContent(
      'WhatsApp, fecha y aviso de privacidad.',
    );
  });

  it('fills the date with the shortcuts and hides the organization for "Particular"', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: '2 semanas' }));
    expect(screen.getByLabelText(/¿Para cuándo lo necesitas\?/)).toHaveValue(neededByDate(14));
    expect(screen.getByRole('button', { name: '2 semanas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    expect(screen.getByRole('textbox', { name: 'Nombre del equipo o institución' })).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Particular' }));
    expect(screen.queryByRole('textbox', { name: 'Nombre del equipo o institución' })).toBeNull();
  });

  it('sends valid data, remembers who and how, and prefills it next time', async () => {
    const user = userEvent.setup();
    const { onValid, unmount } = setup();
    await user.type(screen.getByRole('textbox', { name: /Nombre\s*\*?$/ }), 'Ana López');
    await user.type(screen.getByRole('textbox', { name: /WhatsApp/ }), '55 1234 5678');
    await user.click(screen.getByRole('radio', { name: 'Escuela o academia' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Nombre del equipo o institución' }),
      'Academia Sur',
    );
    await user.click(screen.getByRole('button', { name: 'Esta semana' }));
    await user.click(screen.getByRole('radio', { name: 'Envío (lo acordamos por WhatsApp)' }));
    await user.click(screen.getByRole('radio', { name: 'Sí' }));
    await user.click(screen.getByRole('checkbox', { name: /aviso de privacidad/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(onValid.mock.calls[0]![0]).toMatchObject({
      customer: {
        name: 'Ana López',
        phone: '5512345678',
        type: 'school_academy',
        organization: 'Academia Sur',
      },
      neededBy: neededByDate(7),
      deliveryMethod: 'shipping',
      requiresInvoice: true,
      privacyAccepted: true,
      privacyVersion: '2026-10',
    });
    const saved = JSON.parse(window.localStorage.getItem(REQUESTER_STORAGE_KEY) ?? '{}');
    expect(saved.draft).toEqual({
      name: 'Ana López',
      phone: '5512345678',
      type: 'school_academy',
      organization: 'Academia Sur',
      deliveryMethod: 'shipping',
      requiresInvoice: true,
    });

    unmount();
    setup();
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /Nombre\s*\*?$/ })).toHaveValue('Ana López'),
    );
    expect(screen.getByRole('radio', { name: 'Escuela o academia' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /aviso de privacidad/ })).not.toBeChecked();
    expect(screen.getByLabelText(/¿Para cuándo lo necesitas\?/)).toHaveValue('');
  });
});
