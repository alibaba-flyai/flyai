"use client";

import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { initAnalytics } from "@/lib/analytics";

export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
