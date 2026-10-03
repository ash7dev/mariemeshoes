/** Silhouette de l'Index des marques pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement des marques" className="mx-auto w-full max-w-[90rem] lg:px-20">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-4 px-4 pt-[18px] lg:px-0 lg:pt-16">
        <div className="h-3 w-48 animate-pulse rounded-full bg-card" />
        <div className="h-24 w-full max-w-2xl animate-pulse rounded-3xl bg-card lg:h-40" />
        <div className="mt-6 flex flex-col">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-t border-border py-5 lg:py-8">
              <div className="h-8 w-40 animate-pulse rounded-2xl bg-card lg:h-16 lg:w-80" />
              <div className="ml-auto size-10 animate-pulse rounded-full bg-card lg:size-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
