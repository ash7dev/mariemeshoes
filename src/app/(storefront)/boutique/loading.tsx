/** Silhouette de la boutique pendant le chargement (changement de filtre ou de pointure). */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement des paires" className="mx-auto w-full max-w-[90rem] lg:px-20">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-3 px-4 pt-3.5 lg:px-0 lg:pb-7 lg:pt-[52px]">
        <div className="h-10 w-56 animate-pulse rounded-2xl bg-card lg:h-[4.5rem] lg:w-96" />
        <div className="h-4 w-64 animate-pulse rounded-full bg-card" />
      </div>
      <div className="mx-auto mt-[18px] flex max-w-[80rem] flex-col gap-5 px-4 lg:mt-0 lg:px-0">
        <div className="h-[118px] animate-pulse rounded-[28px] bg-section lg:h-[110px] lg:rounded-[36px]" />
        <div className="hidden h-16 animate-pulse rounded-full bg-card lg:block" />
        <div className="grid grid-cols-1 gap-4 lg:mt-12 lg:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={i > 1 ? 'hidden lg:block' : undefined}>
              <div className="h-[420px] animate-pulse rounded-[28px] bg-card" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
