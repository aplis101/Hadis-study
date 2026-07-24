interface SkeletonProps {
  className?: string;
}

function pulse() {
  return "animate-pulse bg-stone-200 rounded";
}

function CardSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-stone-200 p-4 space-y-3 ${className}`}
    >
      <div className={`${pulse()} h-32 w-full rounded-lg`} />
      <div className={`${pulse()} h-4 w-3/4`} />
      <div className={`${pulse()} h-3 w-1/2`} />
      <div className={`${pulse()} h-3 w-2/3`} />
    </div>
  );
}

function TextLineSkeleton({ className = "" }: SkeletonProps) {
  return <div className={`${pulse()} h-4 w-full ${className}`} />;
}

function CircleSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`${pulse()} rounded-full size-10 shrink-0 ${className}`}
    />
  );
}

function ListSkeleton({ count = 3, className = "" }: SkeletonProps & { count?: number }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3"
        >
          <CircleSkeleton />
          <div className="flex-1 space-y-2">
            <div className={`${pulse()} h-4 w-1/2`} />
            <div className={`${pulse()} h-3 w-1/3`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Skeleton({ className = "", count = 1 }: SkeletonProps & { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${pulse()} ${className}`} />
      ))}
    </>
  );
}

export { CardSkeleton, TextLineSkeleton, CircleSkeleton, ListSkeleton, Skeleton };
