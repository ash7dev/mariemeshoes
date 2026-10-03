/** Silhouette de la fiche produit pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la paire" className="mx-2 animate-pulse rounded-[36px] bg-deep/90 lg:mx-6 lg:mt-6 lg:rounded-[56px]">
      <div className="mx-auto flex max-w-[80rem] flex-col items-center gap-6 px-5 py-8 lg:grid lg:min-h-[47.5rem] lg:grid-cols-[330px_minmax(0,1fr)_330px] lg:px-0 lg:py-12">
        <div className="flex w-full flex-col gap-3">
          <div className="h-3 w-24 rounded-full bg-deep-line" />
          <div className="h-12 w-56 rounded-2xl bg-deep-line" />
          <div className="h-7 w-40 rounded-full bg-deep-line" />
        </div>
        <div className="size-[300px] rounded-full bg-deep-line lg:size-[480px]" />
        <div className="hidden h-80 w-full rounded-[28px] bg-deep-line lg:block" />
      </div>
    </div>
  );
}
