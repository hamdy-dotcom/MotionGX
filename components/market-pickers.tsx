"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type Option = { value: string; label: string; hint?: string; group?: string };

/** Arabic and Latin search that ignores case, hamza / ta-marbuta / alef-maqsura forms and diacritics */
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[ً-ٰٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[̀-ͯ]/g, "");

/** A searchable dropdown: one value (`multiple` false) or many, shown as removable chips. Keyboard: ↑ ↓ Enter Esc. */
export function SearchSelect({ options, value, onChange, multiple = false, placeholder, empty, label }: {
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
  placeholder: string;
  empty: string;
  label: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => { const n = norm(q.trim()); return n ? options.filter((o) => norm(`${o.label} ${o.hint ?? ""} ${o.value}`).includes(n)) : options; }, [options, q]);
  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const pick = (v: string) => {
    if (multiple) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    else { onChange([v]); setOpen(false); }
    setQ("");
    input.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(shown.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter" && open && shown[hi]) { e.preventDefault(); pick(shown[hi].value); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !q && multiple && value.length) onChange(value.slice(0, -1));
  };
  const single = !multiple && value[0] ? byValue.get(value[0]) : null;

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <div className="field flex min-h-12 flex-wrap items-center gap-1.5 bg-white py-1.5" onClick={() => { setOpen(true); input.current?.focus(); }}>
        {multiple ? value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-dark">
            {byValue.get(v)?.label ?? v}
            <button type="button" aria-label={`× ${byValue.get(v)?.label ?? v}`} onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== v)); }} className="leading-none">×</button>
          </span>
        )) : null}
        <input
          ref={input}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-label={label}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={single ? single.label : value.length && multiple ? "" : placeholder}
          className={`min-w-24 flex-1 bg-transparent text-sm outline-none ${single && !q ? "placeholder:text-ink" : ""}`}
        />
        <span aria-hidden="true" className="text-xs text-ink-muted">▾</span>
      </div>
      {open ? (
        <ul id={`${id}-list`} role="listbox" aria-multiselectable={multiple} className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-2xl border border-black/5 bg-white p-1 shadow-xl">
          {shown.length ? shown.map((o, i) => {
            const on = value.includes(o.value);
            const head = o.group && (i === 0 || shown[i - 1].group !== o.group);
            return (
              <li key={o.value}>
                {head ? <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{o.group}</p> : null}
                <button type="button" role="option" aria-selected={on} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.value)} onMouseEnter={() => setHi(i)} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-sm ${i === hi ? "bg-primary-light/60" : ""}`}>
                  <span>{o.label}{o.hint ? <span className="ms-2 text-xs text-ink-muted">{o.hint}</span> : null}</span>
                  {on ? <span aria-hidden="true" className="text-primary">✓</span> : null}
                </button>
              </li>
            );
          }) : <li className="px-3 py-2 text-sm text-ink-muted">{empty}</li>}
        </ul>
      ) : null}
    </div>
  );
}
