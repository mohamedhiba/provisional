import { NextRequest, NextResponse } from "next/server";

import {
  createPersonalizedBriefing,
} from "@/lib/briefing-service";
import {
  getBriefingWindow,
  getBriefingMomentLabel,
  isBriefingMomentId,
  type BriefingWindow,
} from "@/lib/briefing";
import {
  resolvePersistenceIdentity,
  withDeviceCookie,
} from "@/lib/server-persistence";

function isIsoDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export async function GET(request: NextRequest) {
  const identity = await resolvePersistenceIdentity();
  const searchParams = request.nextUrl.searchParams;

  const momentId = searchParams.get("moment");
  const date = searchParams.get("date");
  const weekStart = searchParams.get("weekStart");
  const monthStart = searchParams.get("monthStart");
  const skipAi = searchParams.get("skipAi") === "1";

  const fallbackWindow = getBriefingWindow();
  const hasExplicitWindow =
    isBriefingMomentId(momentId) &&
    isIsoDate(date) &&
    isIsoDate(weekStart) &&
    isIsoDate(monthStart);

  const window: BriefingWindow =
    hasExplicitWindow
      ? {
          id: momentId as BriefingWindow["id"],
          label: getBriefingMomentLabel(momentId as BriefingWindow["id"]),
          date: date as string,
          weekStart: weekStart as string,
          monthStart: monthStart as string,
          cacheBucket: `${momentId as string}:${date as string}`,
        }
      : fallbackWindow;

  const normalizedWindow =
    window.id === "day-start" || window.id === "midday-reset"
      ? window
      : window.id === "week-start" || window.id === "midweek-correction"
        ? {
            ...window,
            cacheBucket: `${window.id}:${window.weekStart}`,
          }
        : {
            ...window,
            cacheBucket: `${window.id}:${window.monthStart}`,
          };

  const briefing = await createPersonalizedBriefing(
    {
      authUserId: identity.authUserId,
      deviceId: identity.deviceId,
    },
    normalizedWindow,
    skipAi
      ? {
          skipAi: true,
          skipAiReason: "Gemini is paused locally to avoid wasting free-tier quota after a recent rate-limit hit.",
        }
      : undefined,
  );

  return withDeviceCookie(
    NextResponse.json({
      briefing,
    }),
    identity,
  );
}
