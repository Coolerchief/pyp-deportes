'use client';

import type { FilterKey, ListingFilters } from '@pyp/shared';
import { Check, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { cx } from '@/lib/cx';
import type { FacetGroup } from '@/lib/facets';

type FilterPanelProps = {
  groups: FacetGroup[];
  /** Customizable products under the other filters; the group hides when the listing has none. */
  personalizableCount: number;
  showPersonalizable: boolean;
  filters: ListingFilters;
  onToggle: (key: FilterKey, value: string) => void;
  onTogglePersonalizable: () => void;
  /** Brands shown before "Ver n marcas más" (3 on mobile, 4 on desktop, as in the design). */
  brandLimit: number;
};

const GROUP_TITLE = 'type-h4 text-[17px] lg:text-[17px]';

function CheckboxRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] lg:min-h-9">
      <span className="relative inline-flex size-5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer border-borde-control checked:bg-noche checked:border-noche size-5 cursor-pointer appearance-none rounded-sm border"
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="text-blanco pointer-events-none absolute inset-0.5 hidden size-4 peer-checked:block"
        />
      </span>
      <span className="grow">{label}</span>
      <span className="text-grafito-suave text-[13px]">{count}</span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className="border-linea border-b py-4">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className="flex min-h-9 w-full items-center justify-between"
        >
          <span className={GROUP_TITLE}>{title}</span>
          <ChevronDown
            aria-hidden="true"
            className={cx('size-5 transition-transform', !open && '-rotate-90')}
          />
        </button>
      </h3>
      <div id={id} hidden={!open} className="mt-1.5">
        {children}
      </div>
    </div>
  );
}

/**
 * Filter groups (UI/UX §7.4 FilterPanel): Personalizable, Deporte, Categoría, Marca and Para,
 * collapsible, with checkboxes and counts. Used by the mobile sheet and the desktop side panel.
 */
export function FilterPanel({
  groups,
  personalizableCount,
  showPersonalizable,
  filters,
  onToggle,
  onTogglePersonalizable,
  brandLimit,
}: FilterPanelProps) {
  const [allBrands, setAllBrands] = useState(false);
  return (
    <div>
      {showPersonalizable && (
        <Group title="Personalizable">
          <CheckboxRow
            label="Solo personalizables"
            count={personalizableCount}
            checked={filters.personalizable}
            onChange={onTogglePersonalizable}
          />
        </Group>
      )}
      {groups.map((group) => {
        const limited = group.key === 'marca' && !allBrands && group.options.length > brandLimit;
        const options = limited ? group.options.slice(0, brandLimit) : group.options;
        return (
          <Group key={group.key} title={group.title}>
            {options.map((option) => (
              <CheckboxRow
                key={option.value}
                label={option.label}
                count={option.count}
                checked={(filters[group.key] as string[]).includes(option.value)}
                onChange={() => onToggle(group.key, option.value)}
              />
            ))}
            {limited && (
              <button
                type="button"
                onClick={() => setAllBrands(true)}
                className="text-rojo-profundo mt-1 min-h-9 text-sm font-semibold"
              >
                Ver {group.options.length - brandLimit} marcas más
              </button>
            )}
          </Group>
        );
      })}
    </div>
  );
}
