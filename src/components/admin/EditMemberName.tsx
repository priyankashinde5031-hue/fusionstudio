"use client";

import { useState, useTransition } from "react";
import type { FormState } from "@/app/admin/(dash)/members/actions";

export function EditMemberName({
  action,
  initialName,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initialName: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action({}, fd);
      if (res.error) setError(res.error);
      else {
        setError(undefined);
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <h1 className="display text-4xl">{initialName ?? "Unnamed member"}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded-md transition-colors"
          style={{ color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
          title="Edit name"
        >
          ✎ Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        name="name"
        defaultValue={initialName ?? ""}
        autoFocus
        maxLength={80}
        className="input"
        style={{ maxWidth: 280, height: 40 }}
        placeholder="Member name"
      />
      <button type="submit" className="btn btn-gold btn-sm" disabled={pending} aria-busy={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
        Cancel
      </button>
      {error && (
        <span className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </span>
      )}
    </form>
  );
}
