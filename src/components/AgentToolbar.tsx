"use client";

import { Agent, AgentType, AgentStatus } from "@/lib/types";

interface AgentToolbarProps {
  agents: Agent[];
  agentStatuses: Record<AgentType, AgentStatus>;
}

export function AgentToolbar({ agents, agentStatuses }: AgentToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {agents.map((agent) => {
        const status = agentStatuses[agent.id] || "idle";
        return (
          <button
            key={agent.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 cursor-default"
            style={{
              background: status === "idle" ? agent.colorBg : agent.colorBg,
              color: agent.color,
              boxShadow:
                status === "thinking"
                  ? `0 0 12px ${agent.colorBg}`
                  : status === "done"
                    ? `0 0 8px ${agent.colorBg}`
                    : "none",
            }}
          >
            <span className={status === "thinking" ? "animate-agent-thinking" : ""}>
              {agent.icon}
            </span>
            <span>{agent.name}</span>
            {status === "thinking" && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-live" style={{ background: agent.color }} />
            )}
            {status === "done" && (
              <span className="text-[10px] opacity-70">✓</span>
            )}
          </button>
        );
      })}
      <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
        style={{ background: "rgba(113,113,122,0.15)", color: "#71717a" }}>
        <span>+</span>
        <span>Add skill</span>
      </button>
    </div>
  );
}
