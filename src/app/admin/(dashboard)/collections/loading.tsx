/** Silhouette de la liste des collections pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement des collections" className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-2">
        <div className="h-10 w-56 animate-pulse rounded-2xl bg-card" />
        <div className="h-4 w-80 animate-pulse rounded-full bg-card" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[28px] border border-border bg-surface p-5">
          <div className="size-[72px] shrink-0 animate-pulse rounded-2xl bg-card" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-card" />
            <div className="h-3 w-1/4 animate-pulse rounded-full bg-card" />
          </div>
        </div>
      ))}
    </div>
  );
}
