import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { TRACK_EVENT, type TrackDetail } from '@/lib/analytics/track';
import { gaMeasurementId } from '@/lib/analytics/events';
import { TrackOnMount, WhatsAppClickTracker } from './Analytics';

function listen() {
  const seen: TrackDetail[] = [];
  const listener = (e: Event) => seen.push((e as CustomEvent<TrackDetail>).detail);
  window.addEventListener(TRACK_EVENT, listener);
  return { seen, stop: () => window.removeEventListener(TRACK_EVENT, listener) };
}

let stop = () => {};
afterEach(() => stop());

describe('gaMeasurementId', () => {
  it('accepts only a GA4 measurement ID', () => {
    expect(gaMeasurementId(' G-ABC123XYZ ')).toBe('G-ABC123XYZ');
    expect(gaMeasurementId(undefined)).toBeNull();
    expect(gaMeasurementId('UA-1234-1')).toBeNull();
    expect(gaMeasurementId("G-1');alert(1);//")).toBeNull();
  });
});

describe('WhatsAppClickTracker', () => {
  it('sends whatsapp_click with the origin of the marked section', async () => {
    const events = listen();
    stop = events.stop;
    const { getByRole } = render(
      <>
        <WhatsAppClickTracker />
        <div data-wa-origin="product">
          <a href="https://wa.me/525500000000?text=x" onClick={(e) => e.preventDefault()}>
            Preguntar
          </a>
        </div>
        <a href="https://wa.me/525500000000" onClick={(e) => e.preventDefault()}>
          Suelto
        </a>
        <a href="https://instagram.com/pyp" onClick={(e) => e.preventDefault()}>
          Instagram
        </a>
      </>,
    );
    const user = userEvent.setup();
    await user.click(getByRole('link', { name: 'Preguntar' }));
    await user.click(getByRole('link', { name: 'Suelto' }));
    await user.click(getByRole('link', { name: 'Instagram' }));
    expect(events.seen).toEqual([
      { event: 'whatsapp_click', params: { origin: 'product' } },
      { event: 'whatsapp_click', params: { origin: 'other' } },
    ]);
  });
});

describe('TrackOnMount', () => {
  it('sends its event once', () => {
    const events = listen();
    stop = events.stop;
    const params = { items: [{ item_id: 'B', item_name: 'Balón' }] };
    const { rerender } = render(<TrackOnMount event="view_item" params={params} />);
    rerender(<TrackOnMount event="view_item" params={{ ...params }} />);
    expect(events.seen).toEqual([{ event: 'view_item', params }]);
  });
});
