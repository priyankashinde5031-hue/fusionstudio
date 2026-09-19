export default function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mobile-first: a phone-width column, centered with hairline sides on desktop.
  return (
    <div className="flex-1 flex justify-center">
      <div
        className="w-full max-w-md flex flex-col min-h-full"
        style={{ borderInline: "1px solid var(--color-hairline)" }}
      >
        {children}
      </div>
    </div>
  );
}
