import { agents } from "./agents";

export interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "official" | "community";
  author: string;
  color: string;
  colorBg: string;
}

// Official skills — derived directly from the flyai CLI commands
export const officialSkills: Skill[] = agents.map((a) => ({
  id: a.id,
  name: a.name,
  icon: a.icon,
  description: a.description,
  category: "official" as const,
  author: "FlyAI",
  color: a.color,
  colorBg: a.colorBg,
}));

// ── ClawHub API ──

export interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  author: string;
  highlighted?: boolean;
}

const CLAWHUB_API = "https://clawhub.ai/api/v1";

export async function searchClawHub(query: string): Promise<ClawHubSkill[]> {
  const res = await fetch(
    `${CLAWHUB_API}/search?${new URLSearchParams({ q: query, limit: "20" })}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  // The API returns an array of skill objects
  return Array.isArray(data) ? data : data.skills ?? data.results ?? [];
}

export async function listClawHubLatest(): Promise<ClawHubSkill[]> {
  const res = await fetch(`${CLAWHUB_API}/skills?limit=20`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data.skills ?? data.results ?? [];
}

// ── Persistence ──

export interface AddedSkill {
  id: string;
  name: string;
  icon: string;
  description: string;
  author: string;
  color: string;
  colorBg: string;
  category: "official" | "community";
  slug?: string; // clawhub slug for community skills
  instructions?: string; // downloaded SKILL.md content — the skill's brain
}

const STORAGE_KEY = "flyai-added-skills";

export function getAddedSkills(): AddedSkill[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAddedSkills(skills: AddedSkill[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
}

// ── Skill Detection ──

// Detect which added skills are relevant to a query
export function detectSkills(query: string, added: AddedSkill[]): AddedSkill[] {
  if (added.length === 0) return [];
  const q = query.toLowerCase();

  return added.filter((skill) => {
    // Build keyword set from slug, name, and description
    const slug = (skill.slug || skill.id).replace(/^clawhub:/, "");
    const words = [
      ...slug.split(/[-_]/),
      ...skill.name.toLowerCase().split(/\s+/),
      ...skill.description.toLowerCase().split(/\s+/).filter((w) => w.length > 3),
    ];
    // Dedupe
    const keywords = [...new Set(words)].filter((w) => w.length > 2);
    return keywords.some((kw) => q.includes(kw));
  });
}

// ── Skill Execution ──

export interface SkillResult {
  skillId: string;
  skill: AddedSkill;
  items: SkillResultItem[];
  error?: string;
}

export interface SkillResultItem {
  title: string;
  description: string;
  url?: string;
  meta?: string;
}

// Assign a color to a community skill based on its slug hash
const COMMUNITY_COLORS = [
  { color: "#ec4899", colorBg: "rgba(236,72,153,0.15)" },
  { color: "#f97316", colorBg: "rgba(249,115,22,0.15)" },
  { color: "#22c55e", colorBg: "rgba(34,197,94,0.15)" },
  { color: "#8b5cf6", colorBg: "rgba(139,92,246,0.15)" },
  { color: "#06b6d4", colorBg: "rgba(6,182,212,0.15)" },
  { color: "#eab308", colorBg: "rgba(234,179,8,0.15)" },
  { color: "#ef4444", colorBg: "rgba(239,68,68,0.15)" },
  { color: "#3b82f6", colorBg: "rgba(59,130,246,0.15)" },
];

export function colorForSlug(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return COMMUNITY_COLORS[Math.abs(hash) % COMMUNITY_COLORS.length];
}
