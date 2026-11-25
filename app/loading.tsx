import { CardGridSkeleton } from "@/components/feedback/states";

export default function Loading() {
  return (
    <div className="container py-12">
      <CardGridSkeleton count={4} />
    </div>
  );
}
