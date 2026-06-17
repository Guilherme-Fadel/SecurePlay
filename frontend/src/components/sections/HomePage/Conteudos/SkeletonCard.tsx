export function SkeletonCard() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse overflow-hidden">
      <div className="h-36 bg-[var(--surface-alt)] rounded-t-2xl" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 w-3/4 bg-[var(--surface-alt)] rounded-lg" />
        <div className="h-3 w-full bg-[var(--surface-alt)] rounded-lg" />
        <div className="h-3 w-2/3 bg-[var(--surface-alt)] rounded-lg" />
        <div className="h-2 w-full bg-[var(--surface-alt)] rounded-full" />
        <div className="flex justify-between">
          <div className="h-3 w-16 bg-[var(--surface-alt)] rounded-lg" />
          <div className="h-3 w-12 bg-[var(--surface-alt)] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonAula() {
  return (
    <div className="flex flex-col gap-4 animate-pulse p-6">
      <div className="h-4 w-32 bg-[var(--surface-alt)] rounded-lg" />
      <div className="aspect-[4/3] bg-[var(--surface)] rounded-2xl border border-[var(--border)]" />
      <div className="h-16 bg-[var(--surface)] rounded-2xl border border-[var(--border)]" />
    </div>
  );
}
