import { WeeklyReviewWorkspace } from "@/components/review/weekly-review-workspace";
import { WeeklyReviewProvider } from "@/components/providers/weekly-review-provider";

export default function WeeklyReviewPage() {
  return (
    <WeeklyReviewProvider>
      <WeeklyReviewWorkspace />
    </WeeklyReviewProvider>
  );
}
