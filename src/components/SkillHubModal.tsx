"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ClawHubSkill, AddedSkill, colorForSlug, officialSkills } from "@/lib/skills";

interface SkillHubModalProps {
  open: boolean;
  onClose: () => void;
  addedSkills: AddedSkill[];
  onToggleSkill: (skill: AddedSkill) => void;
}

export function SkillHubModal({ open, onClose, addedSkills, onToggleSkill }: SkillHubModalProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ClawHubSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const addedIds = new Set(addedSkills.map((s) => s.id));
  const communitySkills = addedSkills.filter((s) => s.category === "community");

  const searchClawHub = useCallback(async (q: string) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/clawhub${params}`);
      const data = await res.json();
      setResults(data.skills || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchClawHub(search), 400);
    return () => clearTimeout(debounceRef.current);
  }, [search, open, searchClawHub]);

  // Auto-focus search on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch("");
      setHasSearched(false);
      setResults([]);
    }
  }, [open]);

  if (!open) return null;

  async function handleInstall(skill: ClawHubSkill) {
    const skillId = `clawhub:${skill.slug}`;

    if (addedIds.has(skillId)) {
      const existing = addedSkills.find((s) => s.id === skillId);
      if (existing) onToggleSkill(existing);
      return;
    }

    setInstalling((prev) => new Set(prev).add(skill.slug));

    try {
      const res = await fetch("/api/skill-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: skill.slug }),
      });
      const data = await res.json();
      const colors = colorForSlug(skill.slug);

      onToggleSkill({
        id: skillId,
        name: data.name || skill.name || skill.slug,
        icon: "🧩",
        description: data.description || skill.description || "",
        author: data.author || skill.author || "Community",
        color: colors.color,
        colorBg: colors.colorBg,
        category: "community",
        slug: skill.slug,
        instructions: data.instructions || "",
      });
    } catch {
      const colors = colorForSlug(skill.slug);
      onToggleSkill({
        id: skillId,
        name: skill.name || skill.slug,
        icon: "🧩",
        description: skill.description || "",
        author: skill.author || "Community",
        color: colors.color,
        colorBg: colors.colorBg,
        category: "community",
        slug: skill.slug,
      });
    } finally {
      setInstalling((prev) => {
        const next = new Set(prev);
        next.delete(skill.slug);
        return next;
      });
    }
  }

  function handleRemove(skill: AddedSkill) {
    onToggleSkill(skill);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl max-h-[80vh] mx-4 rounded-2xl border overflow-hidden flex flex-col animate-modal-in"
        style={{ background: "var(--color-background)", borderColor: "var(--color-card-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + Search */}
        <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: "var(--color-card-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>
                Add Skill
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                Search and install skills from{" "}
                <a
                  href="https://clawhub.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                  style={{ color: "var(--color-accent)" }}
                >
                  ClawHub
                </a>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors hover:bg-white/10"
              style={{ color: "var(--color-muted)" }}
            >
              ✕
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--color-muted)" }}>
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search skills... e.g. weather, news, translator"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--color-input-bg)",
                border: "1px solid var(--color-input-border)",
                color: "var(--color-foreground)",
              }}
            />
            {loading && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] animate-pulse-live"
                style={{ color: "var(--color-muted)" }}
              >
                Searching...
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
          {/* Installed skills section */}
          {(officialSkills.length > 0 || communitySkills.length > 0) && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
                Installed
              </p>
              <div className="flex flex-wrap gap-2">
                {officialSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: skill.colorBg, color: skill.color }}
                  >
                    {skill.icon} {skill.name}
                    <span className="text-[10px] opacity-50">built-in</span>
                  </span>
                ))}
                {communitySkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => handleRemove(skill)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: skill.colorBg, color: skill.color }}
                    title="Click to remove"
                  >
                    {skill.icon} {skill.name}
                    <span className="text-[10px] opacity-50 group-hover:hidden">installed</span>
                    <span className="text-[10px] hidden group-hover:inline" style={{ color: "#f87171" }}>✕</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search results */}
          <div>
            {!hasSearched ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  Loading skills...
                </p>
              </div>
            ) : !loading && results.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🧩</p>
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  {search.trim() ? `No skills found for "${search}"` : "No skills available"}
                </p>
                <a
                  href={`https://clawhub.ai${search.trim() ? `/search?q=${encodeURIComponent(search)}` : ""}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
                >
                  Browse on ClawHub.ai →
                </a>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
                  {search.trim() ? `Results for "${search}"` : "Popular skills"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.map((skill) => {
                    const skillId = `clawhub:${skill.slug}`;
                    const isAdded = addedIds.has(skillId);
                    const isInstalling = installing.has(skill.slug);
                    const colors = colorForSlug(skill.slug);
                    return (
                      <div
                        key={skill.slug}
                        className="group relative p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                          background: "var(--color-card)",
                          borderColor: isAdded ? colors.color + "40" : "var(--color-card-border)",
                          boxShadow: isAdded ? `0 0 12px ${colors.colorBg}` : "none",
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: colors.colorBg }}
                          >
                            🧩
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                                {skill.name || skill.slug}
                              </span>
                            </div>
                            <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--color-muted)" }}>
                              {skill.description || "No description"}
                            </p>
                            <p className="text-[10px] mt-1.5" style={{ color: "var(--color-muted)", opacity: 0.6 }}>
                              by {skill.author || "Unknown"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleInstall(skill)}
                          disabled={isInstalling}
                          className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 hover:scale-105 disabled:opacity-60"
                          style={{
                            background: isAdded
                              ? "rgba(34,197,94,0.15)"
                              : isInstalling
                                ? "rgba(113,113,122,0.15)"
                                : colors.colorBg,
                            color: isAdded ? "#4ade80" : isInstalling ? "#71717a" : colors.color,
                            border: `1px solid ${isAdded ? "rgba(34,197,94,0.2)" : colors.color + "30"}`,
                          }}
                        >
                          {isInstalling ? "Installing..." : isAdded ? "Installed ✓" : "Install"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{ borderColor: "var(--color-card-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            {officialSkills.length + communitySkills.length} skill{officialSkills.length + communitySkills.length !== 1 ? "s" : ""} installed
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
