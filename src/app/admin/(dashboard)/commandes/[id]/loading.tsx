/** Silhouette de la fiche commande pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la commande" className="flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-28 animate-pulse rounded-full bg-card" />
        <div className="h-10 w-64 animate-pulse rounded-2xl bg-card" />
        <div className="h-4 w-80 animate-pulse rounded-full bg-card" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-5">
        <div className="flex flex-col gap-4 lg:order-2">
          {[200, 160, 220].map((height) => (
            <div key={height} className="animate-pulse rounded-[28px] border border-border bg-surface" style={{ height }} />
          ))}
        </div>
        <div className="flex flex-col gap-4 lg:order-1">
          {[110, 320, 160].map((height) => (
            <div key={height} className="animate-pulse rounded-[28px] border border-border bg-surface" style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  );
}
