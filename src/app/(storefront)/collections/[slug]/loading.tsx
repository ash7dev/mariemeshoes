/** Silhouette de la page collection pendant le chargement. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement de la collection" className="mx-2 animate-pulse rounded-[36px] bg-deep/90 lg:mx-6 lg:mt-6 lg:rounded-[48px]">
      <div className="flex flex-col gap-5 px-5 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center lg:gap-16 lg:px-14 lg:py-12">
        <div className="flex flex-col gap-4">
          <div className="h-3 w-40 rounded-full bg-deep-line" />
          <div className="h-14 w-64 rounded-2xl bg-deep-line lg:h-24 lg:w-[28rem]" />
          <div className="h-4 w-full max-w-md rounded-full bg-deep-line" />
          <div className="h-16 w-full rounded-2xl bg-deep-line" />
        </div>
        <div className="mx-auto h-[330px] w-full max-w-[300px] rounded-[150px_150px_24px_24px] bg-deep-line lg:h-[620px] lg:max-w-[520px] lg:rounded-[260px_260px_32px_32px]" />
      </div>
    </div>
  );
}
