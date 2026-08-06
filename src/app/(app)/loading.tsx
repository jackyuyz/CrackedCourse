import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-7 lg:px-10">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-[430px] max-w-full" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-56 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
