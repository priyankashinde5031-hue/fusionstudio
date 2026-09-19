"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="text-xs px-2 py-1 rounded-md shrink-0"
      style={{
        color: "var(--color-danger)",
        border: "1px solid color-mix(in srgb, var(--color-danger) 45%, transparent)",
        background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
      }}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "Removing…" : "Confirm"}
    </button>
  );
}

export function UnassignButton({
  action,
  label,
}: {
  action: () => Promise<void>;
  label: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="text-xs px-2 py-1 rounded-md shrink-0 transition-colors"
        style={{ color: "var(--color-muted)", border: "1px solid var(--color-hairline)" }}
        title={`Remove ${label} from this member`}
      >
        Remove
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1 shrink-0">
      <ConfirmBtn />
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="text-xs px-2 py-1 rounded-md"
        style={{ color: "var(--color-faint)" }}
      >
        Cancel
      </button>
    </form>
  );
}
