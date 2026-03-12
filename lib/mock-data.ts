export const dashboardData = {
  dateLabel: "Thursday, March 12",
  streak: 6,
  score: 68,
  scoreLabel: "Strong",
  weeklyProgress: "3 of 5 winning days",
  oneThing: "Finish off-cycle internship applications batch",
  topThree: [
    {
      title: "Apply to 3 off-cycle roles",
      done: false,
    },
    {
      title: "Finish project deployment notes",
      done: false,
    },
    {
      title: "Complete one 90-minute ML study block",
      done: true,
    },
  ],
  pillars: [
    { name: "Career", progress: 0.75 },
    { name: "Academics", progress: 0.35 },
    { name: "Health", progress: 0.5 },
    { name: "Discipline", progress: 0.25 },
  ],
  warning:
    "You logged activity, but not the highest-value work yet. Planning is close to replacing execution.",
  sessions: [
    { title: "Resume tailoring", planned: 60, actual: 52, quality: 4, depth: "Deep" },
    { title: "ML study block", planned: 90, actual: 95, quality: 5, depth: "Deep" },
  ],
};

export const weeklyMetrics = [
  { label: "Weekly score", value: "482" },
  { label: "Winning days", value: "4" },
  { label: "Deep work", value: "16.5h" },
  { label: "Drift days", value: "2" },
];

export const analyticsCards = [
  {
    label: "Top-task completion",
    value: "71%",
    detail: "Up 12% from the previous week",
  },
  {
    label: "Night review completion",
    value: "83%",
    detail: "5 of the last 6 days closed honestly",
  },
  {
    label: "Deep work hours",
    value: "16.5",
    detail: "Career work is leading; academics are slipping",
  },
  {
    label: "Drift days",
    value: "2",
    detail: "Both came after late sleep and overloaded planning",
  },
];
