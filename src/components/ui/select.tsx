"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

/** Accessible, animated custom dropdown that replaces native <select>. */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  align = "left",
}: {
  value?: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(options.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const o = options[active];
        if (o) {
          onChange(o.value);
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, active, options, onChange]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[13.5px] font-medium transition-colors",
          open ? "border-accent" : "border-line-strong hover:border-ink-soft",
        )}
      >
        <span className={cn("truncate", !selected && "text-ink-soft")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute z-50 mt-1.5 max-h-72 min-w-full overflow-auto rounded-xl border border-line bg-card p-1.5 shadow-card-lg",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {options.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={isSel}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors",
                      i === active ? "bg-accent-wash text-accent-ink" : "text-ink",
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSel && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
