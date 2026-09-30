"use client";

import { useMemo, useState } from "react";
import {
  FONT_PICKER_TABS,
  fontsForCategory,
  type FontPickerCategory,
  type EditorFont,
} from "@/data/fonts";
import { cn } from "@/lib/utils";

type FontPickerProps = {
  value: string;
  onChange: (fontId: string) => void;
  /** Live preview text — usually the selected caption */
  previewText?: string;
  compact?: boolean;
};

export function FontPicker({
  value,
  onChange,
  previewText = "Your style, your video",
  compact = false,
}: FontPickerProps) {
  const [tab, setTab] = useState<FontPickerCategory>("all");
  const fonts = useMemo(() => fontsForCategory(tab), [tab]);
  const sample = (previewText || "Aa").trim().slice(0, 48) || "Aa";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FONT_PICKER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              tab === t.id
                ? "bg-[var(--editor-accent)] text-[#3a1f2a]"
                : "bg-[var(--editor-panel-2)] text-[var(--editor-muted)] hover:text-[var(--editor-fg)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "space-y-1.5 overflow-y-auto pr-1",
          compact ? "max-h-[220px]" : "max-h-[360px]"
        )}
      >
        {fonts.map((f) => (
          <FontRow
            key={f.id}
            font={f}
            active={value === f.id}
            sample={sample}
            onSelect={() => onChange(f.id)}
          />
        ))}
        {fonts.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-[var(--editor-subtle)]">
            No fonts in this category
          </p>
        )}
      </div>
    </div>
  );
}

function FontRow({
  font,
  active,
  sample,
  onSelect,
}: {
  font: EditorFont;
  active: boolean;
  sample: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-[var(--editor-accent)] bg-[var(--editor-accent)]/10"
          : "border-[var(--editor-border)] bg-[var(--editor-panel-2)] hover:border-[var(--editor-muted)]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-[var(--editor-fg)]">
          {font.name}
        </p>
        <p className="shrink-0 text-[9px] uppercase tracking-wide text-[var(--editor-subtle)]">
          {font.aesthetics[0]}
        </p>
      </div>
      <p
        className="mt-1 truncate text-[15px] leading-snug text-[var(--editor-fg)]"
        style={{
          fontFamily: `"${font.family}", system-ui, sans-serif`,
          fontWeight: font.weight,
        }}
      >
        {sample}
      </p>
    </button>
  );
}
