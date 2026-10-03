/** Silhouette de la fiche client pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement du client" className="flex flex-col gap-5 pb-10">
      <div className="h-4 w-24 animate-pulse rounded-full bg-card" />
      <div className="flex items-center gap-4">
        <div className="size-16 animate-pulse rounded-full bg-card" />
        <div className="flex flex-col gap-2">
          <div className="h-9 w-56 animate-pulse rounded-2xl bg-card" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-card" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-[24px] border border-border bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="h-80 animate-pulse rounded-[28px] border border-border bg-surface" />
        <div className="h-64 animate-pulse rounded-[28px] border border-border bg-surface" />
      </div>
    </div>
  );
}
