"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <div className="relative w-full">
      <div
        className="rounded-2xl border transition-all duration-200 focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_1px_var(--color-accent)]"
        style={{
          background: "var(--color-input-bg)",
          borderColor: "var(--color-input-border)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Where do you want to go? Just dream..."
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-4 pt-4 pb-3 text-sm resize-none outline-none placeholder:text-[var(--color-muted)]"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1 text-[var(--color-muted)]">
            <span className="text-[10px] font-mono">agents auto-detect your intent</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 disabled:opacity-30"
            style={{
              background: value.trim() ? "var(--color-accent)" : "transparent",
              color: value.trim() ? "#fff" : "var(--color-muted)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8L8 3L13 8M8 3V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
