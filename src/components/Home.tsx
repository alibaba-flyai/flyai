"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { AgentToolbar } from "@/components/AgentToolbar";
import { SkillHubModal } from "@/components/SkillHubModal";
import { SmartCard } from "@/components/SmartCard";
import { agents, getAgent } from "@/lib/agents";
import { AddedSkill, getAddedSkills, saveAddedSkills } from "@/lib/skills";
import {
  AgentType,
  AgentStatus,
  PlanItem,
  ExecutionResult,
  ChatMessage,
} from "@/lib/types";
import {
  trackQuery,
  trackPlan,
  trackAgentResult,
  trackSuggestionClick,
  trackSkillInstall,
  trackSkillRemove,
  trackError,
} from "@/lib/analytics";

const initialAgentStatuses: Record<AgentType, AgentStatus> = {
  "fast-search": "idle",
  hotel: "idle",
  flight: "idle",
  poi: "idle",
};

const AGENT_IDS = new Set<string>(["fast-search", "hotel", "flight", "poi"]);

// Universal result renderer — one component for all agents and skills.
// SmartCard introspects the data and composes its layout on the fly.
function ResultCards({ result, accent }: { result: ExecutionResult; accent?: { color: string; colorBg: string; label: string } }) {
  if (result.error) {
    return (
      <div
        className="text-xs text-[var(--color-muted)] px-3 py-2 rounded-lg"
        style={{ background: "var(--color-card)" }}
      >
        ⚠️ {result.error}
      </div>
    );
  }

  if (result.items.length === 0) return null;

  return (
    <>
      {result.items.slice(0, 6).map((item, i) => (
        <SmartCard key={i} data={item as Record<string, unknown>} accent={accent} />
      ))}
    </>
  );
}

export function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStatuses, setAgentStatuses] = useState(initialAgentStatuses);
  const [skillStatuses, setSkillStatuses] = useState<Record<string, AgentStatus>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [skillHubOpen, setSkillHubOpen] = useState(false);
  const [addedSkills, setAddedSkills] = useState<AddedSkill[]>([]);

  useEffect(() => {
    setAddedSkills(getAddedSkills());
  }, []);

  const handleToggleSkill = useCallback((skill: AddedSkill) => {
    setAddedSkills((prev) => {
      const exists = prev.some((s) => s.id === skill.id);
      if (exists) {
        trackSkillRemove(skill.id, skill.name);
      } else {
        trackSkillInstall(skill.id, skill.name);
      }
      const next = exists ? prev.filter((s) => s.id !== skill.id) : [...prev, skill];
      saveAddedSkills(next);
      return next;
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper to update the last assistant message
  const updateAssistant = useCallback(
    (updater: (msg: ChatMessage) => void) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updater(last);
        return [...updated];
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (userMessage: string) => {
      setIsProcessing(true);

      // Track query with language detection
      const hasChinese = /[\u4e00-\u9fff]/.test(userMessage);
      const lang = hasChinese ? "zh" : /^[a-zA-Z\s\d.,!?]+$/.test(userMessage) ? "en" : "other";
      trackQuery(userMessage, lang as "en" | "zh" | "other");

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
      };

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const res = await fetch("/api/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: userMessage,
            skills: addedSkills.map((s) => ({
              id: s.id,
              name: s.name,
              slug: s.slug || s.id.replace(/^clawhub:/, ""),
              description: s.description,
              instructions: s.instructions,
            })),
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from the buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // keep incomplete line

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(eventType, data);
              } catch {
                // skip malformed JSON
              }
              eventType = "";
            }
          }
        }

        // Finalize
        updateAssistant((msg) => { msg.isLoading = false; });

        // Reset statuses after a moment
        setTimeout(() => {
          setAgentStatuses(initialAgentStatuses);
          setSkillStatuses({});
        }, 3000);
      } catch (err) {
        trackError("fetch", String(err));
        updateAssistant((msg) => {
          msg.content = `Error: ${String(err)}`;
          msg.isLoading = false;
        });
      }

      setIsProcessing(false);
    },
    [addedSkills, updateAssistant]
  );

  const handleSSEEvent = useCallback(
    (event: string, data: Record<string, unknown>) => {
      switch (event) {
        case "plan": {
          const items = data.items as PlanItem[];
          const thinking = data.thinking as string;
          updateAssistant((msg) => {
            msg.thinking = thinking;
            msg.plan = items;
            msg.results = [];
          });
          // Track plan
          const plannedAgents = (items || []).filter((i) => i.type === "agent").map((i) => i.id);
          const plannedSkills = (items || []).filter((i) => i.type === "skill").map((i) => i.id);
          trackPlan(plannedAgents, plannedSkills);

          // Set all planned items to "thinking" status
          for (const item of items || []) {
            if (AGENT_IDS.has(item.id)) {
              setAgentStatuses((prev) => ({ ...prev, [item.id]: "thinking" as AgentStatus }));
            } else {
              setSkillStatuses((prev) => ({ ...prev, [item.id]: "thinking" as AgentStatus }));
            }
          }
          break;
        }

        case "exec_start": {
          const id = data.id as string;
          if (AGENT_IDS.has(id)) {
            setAgentStatuses((prev) => ({ ...prev, [id]: "thinking" as AgentStatus }));
          } else {
            setSkillStatuses((prev) => ({ ...prev, [id]: "thinking" as AgentStatus }));
          }
          break;
        }

        case "exec_done": {
          const id = data.id as string;
          const error = data.error as string | undefined;
          const status: AgentStatus = error ? "error" : "done";

          // Update status indicators (skip _llm — it's an internal fallback)
          if (id !== "_llm") {
            if (AGENT_IDS.has(id)) {
              setAgentStatuses((prev) => ({ ...prev, [id]: status }));
            } else {
              setSkillStatuses((prev) => ({ ...prev, [id]: status }));
            }
          }

          // Track agent result
          trackAgentResult(id, data.type as "agent" | "skill", ((data.items as unknown[]) || []).length, error);

          // Append result to message (skip _llm — its answer comes via summary)
          const items = (data.items as unknown[]) || [];
          if (id !== "_llm" && (items.length > 0 || error)) {
            updateAssistant((msg) => {
              msg.results = [
                ...(msg.results || []),
                {
                  type: data.type as "agent" | "skill",
                  id,
                  reason: (data.reason as string) || "",
                  items,
                  error,
                },
              ];
            });
          }
          break;
        }

        case "summary": {
          updateAssistant((msg) => {
            msg.summary = data.text as string;
          });
          break;
        }

        case "error": {
          trackError("orchestration", (data.message as string) || "Unknown error");
          updateAssistant((msg) => {
            msg.content = (data.message as string) || "Something went wrong";
            msg.isLoading = false;
          });
          break;
        }
      }
    },
    [updateAssistant]
  );

  const hasMessages = messages.length > 0;

  // Get the AddedSkill object for a skill ID
  function findSkill(id: string): AddedSkill | undefined {
    return addedSkills.find((s) => s.id === id);
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
        style={{
          background: "rgba(10,10,18,0.85)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMessages([]);
              setAgentStatuses(initialAgentStatuses);
              setSkillStatuses({});
              setIsProcessing(false);
            }}
            className="text-xl font-bold cursor-pointer"
          >
            <span style={{ color: "var(--color-accent)" }}>fly</span>
            <span style={{ color: "var(--color-foreground)" }}>.ai</span>
          </button>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono"
            style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
          >
            alpha
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--color-muted)]">
            {agents.length + addedSkills.length} skills
          </span>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)" }}
          >
            Y
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">
                  Where to <span className="animate-rainbow font-extrabold">next</span>?
                </h1>
                <p className="text-sm text-[var(--color-muted)]">
                  Just think out loud. Your agents will handle the rest.
                </p>
              </div>

              <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />

              <div className="mt-4 flex justify-center">
                <AgentToolbar
                  agents={agents}
                  agentStatuses={agentStatuses}
                  addedSkills={addedSkills}
                  skillStatuses={skillStatuses}
                  onAddSkillClick={() => setSkillHubOpen(true)}
                />
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {["杭州三日游", "北京到上海的机票", "三亚酒店推荐", "github trending repos"].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => { trackSuggestionClick(suggestion); handleSubmit(suggestion); }}
                      disabled={isProcessing}
                      className="px-3 py-1.5 rounded-full text-xs transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                      style={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-card-border)",
                        color: "var(--color-badge-text)",
                      }}
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
                {msg.role === "user" ? (
                  <div
                    className="px-4 py-2.5 rounded-2xl rounded-br-sm text-sm max-w-md animate-slide-in"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="space-y-4 animate-slide-in">
                    {/* Loading — before plan arrives */}
                    {msg.isLoading && !msg.plan && (
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 animate-pulse-live"
                          style={{ background: "var(--color-accent)", color: "#fff" }}
                        >
                          f
                        </div>
                        <span className="text-xs animate-pulse-live" style={{ color: "var(--color-muted)" }}>
                          Analyzing your request...
                        </span>
                      </div>
                    )}

                    {/* Plan + live execution status */}
                    {msg.thinking && (
                      <div className="flex items-start gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "var(--color-accent)", color: "#fff" }}
                        >
                          f
                        </div>
                        <div className="space-y-2 flex-1">
                          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                            {msg.thinking}
                          </p>
                          {msg.plan && msg.plan.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {msg.plan.map((item) => {
                                const isAgent = AGENT_IDS.has(item.id);
                                const status = isAgent
                                  ? agentStatuses[item.id as AgentType] || "idle"
                                  : skillStatuses[item.id] || "idle";
                                const agent = isAgent ? getAgent(item.id as AgentType) : null;
                                const skill = !isAgent ? findSkill(item.id) : null;
                                const icon = agent?.icon || skill?.icon || "🧩";
                                const name = agent?.name || skill?.name || item.id;
                                const color = agent?.color || skill?.color || "#c084fc";
                                const colorBg = agent?.colorBg || skill?.colorBg || "rgba(168,85,247,0.15)";

                                return (
                                  <span
                                    key={item.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 animate-slide-in"
                                    style={{
                                      background: colorBg,
                                      color,
                                      boxShadow: status === "thinking" ? `0 0 12px ${colorBg}` : status === "done" ? `0 0 8px ${colorBg}` : "none",
                                    }}
                                    title={item.reason}
                                  >
                                    <span className={status === "thinking" ? "animate-agent-thinking" : ""}>{icon}</span>
                                    <span>{name}</span>
                                    {status === "thinking" && (
                                      <span className="w-1.5 h-1.5 rounded-full animate-pulse-live" style={{ background: color }} />
                                    )}
                                    {status === "done" && <span className="text-[10px] opacity-70">✓</span>}
                                    {status === "error" && <span className="text-[10px] opacity-70">✕</span>}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {!msg.isLoading && msg.content && !msg.results && (
                      <div
                        className="text-sm px-4 py-3 rounded-xl"
                        style={{ background: "var(--color-card)", color: "var(--color-muted)" }}
                      >
                        {msg.content}
                      </div>
                    )}

                    {/* LLM Summary */}
                    {msg.summary && (
                      <div
                        className="ml-8 text-sm leading-relaxed px-4 py-3 rounded-xl"
                        style={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-card-border)",
                        }}
                      >
                        {msg.summary}
                      </div>
                    )}

                    {/* Result cards — universal rendering via SmartCard */}
                    {msg.results && msg.results.length > 0 && (
                      <div className="ml-8 space-y-4">
                        {msg.results.map((result, i) => {
                          // Build accent badge from agent or skill metadata
                          let accent: { color: string; colorBg: string; label: string } | undefined;
                          if (AGENT_IDS.has(result.id)) {
                            const agent = getAgent(result.id as AgentType);
                            if (agent) accent = { color: agent.color, colorBg: agent.colorBg, label: `${agent.icon} ${agent.name}` };
                          } else {
                            const skill = findSkill(result.id);
                            if (skill) accent = { color: skill.color, colorBg: skill.colorBg, label: `${skill.icon} ${skill.name}` };
                          }

                          return (
                            <div
                              key={`${result.id}-${i}`}
                              className="grid grid-cols-1 md:grid-cols-2 gap-3"
                            >
                              <ResultCards result={result} accent={accent} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Bottom input when chat active */}
      {hasMessages && (
        <div
          className="border-t px-4 py-4"
          style={{ borderColor: "var(--color-card-border)", background: "rgba(10,10,18,0.9)" }}
        >
          <div className="max-w-4xl mx-auto space-y-3">
            <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />
            <div className="flex justify-center">
              <AgentToolbar
                agents={agents}
                agentStatuses={agentStatuses}
                addedSkills={addedSkills}
                skillStatuses={skillStatuses}
                onAddSkillClick={() => setSkillHubOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      <SkillHubModal
        open={skillHubOpen}
        onClose={() => setSkillHubOpen(false)}
        addedSkills={addedSkills}
        onToggleSkill={handleToggleSkill}
      />
    </div>
  );
}
