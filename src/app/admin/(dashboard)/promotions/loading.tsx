/** Silhouette de la liste des promotions pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement des promotions" className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-2">
        <div className="h-10 w-56 animate-pulse rounded-2xl bg-card" />
        <div className="h-4 w-48 animate-pulse rounded-full bg-card" />
      </div>
      <div className="h-12 w-full max-w-xl animate-pulse rounded-full bg-card" />
      <div className="h-11 w-full animate-pulse rounded-full bg-card" />
      <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0 lg:px-6">
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-card" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-card" />
              <div className="h-3 w-24 animate-pulse rounded-full bg-card" />
            </div>
            <div className="hidden h-4 w-28 animate-pulse rounded-full bg-card lg:block" />
            <div className="h-10 w-40 animate-pulse rounded-full bg-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
