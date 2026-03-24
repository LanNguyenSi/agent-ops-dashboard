"use client";

import clsx from "clsx";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className,
}: SelectProps) {
  const reactId = useId();
  const buttonId = `select-${reactId}`;
  const listboxId = `${buttonId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const selectedIndex = options.findIndex((o) => o.value === value && !o.disabled);
    const firstEnabled = options.findIndex((o) => !o.disabled);
    setFocusedIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled);
  }, [isOpen, options, value]);

  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return;
    const el = listboxRef.current?.children[focusedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, isOpen]);

  function commit(nextValue: string, nextDisabled?: boolean) {
    if (disabled || nextDisabled) return;
    onChange(nextValue);
    setIsOpen(false);
  }

  function moveFocus(direction: 1 | -1) {
    if (options.length === 0) return;
    const start = focusedIndex >= 0 ? focusedIndex : direction > 0 ? -1 : options.length;
    let next = start;
    do { next += direction; } while (next >= 0 && next < options.length && options[next]?.disabled);
    if (next >= 0 && next < options.length) setFocusedIndex(next);
  }

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={(event) => {
          if (disabled) return;
          switch (event.key) {
            case "ArrowDown":
              event.preventDefault();
              if (!isOpen) setIsOpen(true);
              else moveFocus(1);
              break;
            case "ArrowUp":
              event.preventDefault();
              if (!isOpen) setIsOpen(true);
              else moveFocus(-1);
              break;
            case "Enter":
            case " ":
              event.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
              } else if (focusedIndex >= 0) {
                const opt = options[focusedIndex];
                if (opt) commit(opt.value, opt.disabled);
              }
              break;
            case "Escape":
              if (isOpen) { event.preventDefault(); setIsOpen(false); }
              break;
          }
        }}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-slate-700 outline-none transition",
          "hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={clsx("block truncate", !selectedOption && "text-slate-400")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={clsx("h-4 w-4 shrink-0 text-slate-400 transition", isOpen && "rotate-180")}
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-labelledby={buttonId}
          tabIndex={-1}
          className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 p-1 shadow-2xl backdrop-blur"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onMouseEnter={() => !option.disabled && setFocusedIndex(index)}
                onClick={() => commit(option.value, option.disabled)}
                className={clsx(
                  "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition",
                  option.disabled && "cursor-not-allowed text-slate-300",
                  !option.disabled && "text-slate-700",
                  isFocused && !option.disabled && "bg-slate-100",
                  isSelected && !option.disabled && "bg-sky-50 text-sky-700",
                )}
              >
                <span className={clsx("truncate", isSelected && "font-medium")}>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
