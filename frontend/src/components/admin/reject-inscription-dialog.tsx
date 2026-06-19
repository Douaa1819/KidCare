"use client";

import { useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type RejectInscriptionDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  reasonLabel: string;
  reasonPlaceholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  pending?: boolean;
};

export function RejectInscriptionDialog({
  open,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending,
}: RejectInscriptionDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, pending]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label={cancelLabel}
        onClick={() => {
          if (!pending) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-inscription-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl bg-[var(--status-rejected-bg)] border border-[var(--status-rejected-border)] flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-[var(--status-rejected-text)]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="reject-inscription-dialog-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="reject-inscription-reason" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {reasonLabel}
          </label>
          <Textarea
            id="reject-inscription-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            disabled={pending}
            rows={4}
            maxLength={500}
            className="rounded-xl resize-none text-sm"
          />
          <p className="mt-1 text-[11px] text-muted-foreground text-end">{reason.length}/500</p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-xl gap-2"
            onClick={() => void onConfirm(reason.trim())}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {pending ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
