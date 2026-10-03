/** Silhouette des paramètres pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement des paramètres" className="flex flex-col gap-5 pb-16">
      <div className="flex flex-col gap-2">
        <div className="h-10 w-52 animate-pulse rounded-2xl bg-card" />
        <div className="h-4 w-80 animate-pulse rounded-full bg-card" />
      </div>
      <div className="h-36 animate-pulse rounded-[28px] bg-card" />
      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden h-48 animate-pulse rounded-[24px] bg-card lg:block" />
        <div className="flex max-w-4xl flex-col gap-5">
          {[360, 260, 300].map((height) => (
            <div key={height} className="animate-pulse rounded-[28px] border border-border bg-surface" style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  );
}
