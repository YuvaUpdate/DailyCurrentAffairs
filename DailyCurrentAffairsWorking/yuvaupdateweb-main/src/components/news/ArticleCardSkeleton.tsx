import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ArticleCardSkeleton() {
  return (
    <Card className="border-card-border bg-card overflow-hidden">
      <div className="relative aspect-video bg-muted">
        <Skeleton className="w-full h-full" />
        <Skeleton className="absolute top-3 left-3 h-5 w-16" />
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />

        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}