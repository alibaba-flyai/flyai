import posthog from "posthog-js";

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  if (!key) {
    console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY not set — PostHog disabled");
    return;
  }

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });

  initialized = true;
}

// ── Typed event helpers ──

export function trackQuery(query: string, language: "en" | "zh" | "other") {
  posthog.capture("query_submitted", { query, language });
}

export function trackPlan(agents: string[], skills: string[]) {
  posthog.capture("plan_created", {
    agents,
    skills,
    agent_count: agents.length,
    skill_count: skills.length,
  });
}

export function trackAgentResult(
  id: string,
  type: "agent" | "skill",
  itemCount: number,
  error?: string
) {
  posthog.capture("agent_result", {
    agent_id: id,
    agent_type: type,
    item_count: itemCount,
    success: !error,
    error,
  });
}

export function trackSuggestionClick(suggestion: string) {
  posthog.capture("suggestion_clicked", { suggestion });
}

export function trackSkillInstall(skillId: string, skillName: string) {
  posthog.capture("skill_installed", { skill_id: skillId, skill_name: skillName });
}

export function trackSkillRemove(skillId: string, skillName: string) {
  posthog.capture("skill_removed", { skill_id: skillId, skill_name: skillName });
}

export function trackError(context: string, error: string) {
  posthog.capture("error_occurred", { context, error });
}
