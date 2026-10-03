/** Silhouette du formulaire produit pendant le chargement. */
export default function ProductFormSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="mx-auto flex max-w-4xl flex-col gap-6 pb-32">
      <div className="h-4 w-24 animate-pulse rounded-full bg-card" />
      <div className="h-10 w-72 animate-pulse rounded-2xl bg-card" />
      {[220, 160, 420].map((height) => (
        <div key={height} className="animate-pulse rounded-[28px] border border-border bg-surface p-7" style={{ height }}>
          <div className="h-6 w-40 rounded-full bg-card" />
          <div className="mt-6 h-12 w-full rounded-2xl bg-card" />
        </div>
      ))}
    </div>
  );
}
