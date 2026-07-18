'use client';

import * as React from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { Input, Label } from './ui';

export type TargetPickerItem = {
  id: string;
  url: string;
};

type TargetPickerProps = {
  targets: TargetPickerItem[];
  loading?: boolean;
  value: string;
  selectedId: string;
  onChange: (next: { url: string; targetId: string }) => void;
  label: string;
  required?: boolean;
  placeholder: string;
  loadingLabel: string;
  emptyLabel: string;
  noMatchesLabel: string;
  hint: string;
};

export function TargetPicker({
  targets,
  loading = false,
  value,
  selectedId,
  onChange,
  label,
  required,
  placeholder,
  loadingLabel,
  emptyLabel,
  noMatchesLabel,
  hint,
}: TargetPickerProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);

  const query = value.trim().toLowerCase();
  const filteredTargets = React.useMemo(() => {
    if (!query) {
      return targets;
    }
    return targets.filter((target) => target.url.toLowerCase().includes(query));
  }, [query, targets]);

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const selectTarget = (target: TargetPickerItem) => {
    onChange({ url: target.url, targetId: target.id });
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (nextValue: string) => {
    const matched = targets.find(
      (target) => target.url.toLowerCase() === nextValue.trim().toLowerCase()
    );
    onChange({
      url: nextValue,
      targetId: matched?.id ?? '',
    });
    setOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((index) =>
        filteredTargets.length === 0 ? 0 : Math.min(index + 1, filteredTargets.length - 1)
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' && open && filteredTargets[highlightIndex]) {
      event.preventDefault();
      selectTarget(filteredTargets[highlightIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <Label required={required}>{label}</Label>
      <div className="relative">
        <div className="relative">
          <Globe
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            ref={inputRef}
            value={value}
            onChange={(event) => handleInputChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className="pe-10 ps-9"
            aria-expanded={open}
            aria-controls="target-picker-list"
            aria-autocomplete="list"
            role="combobox"
          />
          <button
            type="button"
            aria-label={open ? 'Close targets' : 'Open targets'}
            onClick={() => {
              setOpen((previous) => !previous);
              inputRef.current?.focus();
            }}
            className="absolute end-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition hover:bg-white/8 hover:text-cyan-300"
          >
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {open && (
          <div
            id="target-picker-list"
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-cyan-400/18 bg-[rgba(8,14,24,0.98)] py-1 shadow-cyber backdrop-blur-md"
          >
            {loading ? (
              <p className="px-3 py-2.5 text-sm text-text-muted">{loadingLabel}</p>
            ) : targets.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-text-muted">{emptyLabel}</p>
            ) : filteredTargets.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-text-muted">{noMatchesLabel}</p>
            ) : (
              filteredTargets.map((target, index) => {
                const isActive = target.id === selectedId;
                const isHighlighted = index === highlightIndex;
                return (
                  <button
                    key={target.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectTarget(target)}
                    className={`flex w-full items-center px-3 py-2.5 text-start text-sm transition ${
                      isHighlighted || isActive
                        ? 'bg-cyan-400/12 text-cyan-100'
                        : 'text-text-secondary hover:bg-white/6 hover:text-text-primary'
                    }`}
                  >
                    <span className="truncate">{target.url}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] text-text-muted">{hint}</p>
    </div>
  );
}
