/** Silhouette de la liste des commandes pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement des commandes" className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-2">
        <div className="h-10 w-56 animate-pulse rounded-2xl bg-card" />
        <div className="h-4 w-72 animate-pulse rounded-full bg-card" />
      </div>
      <div className="h-12 w-full max-w-2xl animate-pulse rounded-full bg-card" />
      <div className="h-11 w-full animate-pulse rounded-full bg-card" />
      <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border p-4 last:border-0 lg:px-6">
            <div className="flex w-32 flex-col gap-2">
              <div className="h-4 w-full animate-pulse rounded-full bg-card" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-card" />
            </div>
            <div className="hidden h-4 w-40 animate-pulse rounded-full bg-card sm:block" />
            <div className="size-11 animate-pulse rounded-xl bg-card" />
            <div className="ml-auto h-7 w-24 animate-pulse rounded-full bg-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
