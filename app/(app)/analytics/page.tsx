import { MetricCard } from "@/components/dashboard/metric-card";
import { analyticsCards } from "@/lib/mock-data";

const trendRows = [
  { week: "Week 1", topTask: "54%", deepWork: "11.5h", drift: "4" },
  { week: "Week 2", topTask: "63%", deepWork: "13.0h", drift: "3" },
  { week: "Week 3", topTask: "71%", deepWork: "16.5h", drift: "2" },
  { week: "Week 4", topTask: "79%", deepWork: "18.0h", drift: "1" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analyticsCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
          />
        ))}
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-black/20 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">
          Trend table
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
          Behavior should improve week over week.
        </h2>
        <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-white/8">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-white/[0.04]">
              <tr>
                {["Week", "Top-task completion", "Deep work", "Drift days"].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-[10px] uppercase tracking-[0.25em] text-stone-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trendRows.map((row) => (
                <tr key={row.week} className="border-t border-white/8">
                  <td className="px-5 py-4 text-sm font-medium text-stone-100">{row.week}</td>
                  <td className="px-5 py-4 text-sm text-stone-300">{row.topTask}</td>
                  <td className="px-5 py-4 text-sm text-stone-300">{row.deepWork}</td>
                  <td className="px-5 py-4 text-sm text-stone-300">{row.drift}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
