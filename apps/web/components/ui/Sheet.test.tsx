import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Sheet } from './Sheet';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Filtrar
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filtrar"
        footer={<button type="button">Ver 6 productos</button>}
      >
        <label>
          <input type="checkbox" /> Solo personalizables
        </label>
      </Sheet>
    </>
  );
}

async function openSheet() {
  const user = userEvent.setup();
  render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Filtrar' });
  await user.click(opener);
  return { user, opener, dialog: screen.getByRole('dialog', { name: 'Filtrar' }) };
}

describe('Sheet', () => {
  it('opens as a labelled modal dialog and focuses its first control', async () => {
    const { dialog } = await openSheet();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  });

  it('keeps Tab and Shift+Tab inside the sheet', async () => {
    const { user } = await openSheet();
    const close = screen.getByRole('button', { name: 'Cerrar' });
    const checkbox = screen.getByRole('checkbox', { name: 'Solo personalizables' });
    const action = screen.getByRole('button', { name: 'Ver 6 productos' });

    await user.tab();
    expect(checkbox).toHaveFocus();
    await user.tab();
    expect(action).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(action).toHaveFocus();
  });

  it('closes with Escape and returns focus to the opener', async () => {
    const { user, opener } = await openSheet();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes from the close button and locks page scroll only while open', async () => {
    const { user, opener } = await openSheet();
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });
});
