"use client";

import { Agent, AgentType, AgentStatus } from "@/lib/types";
import { AddedSkill } from "@/lib/skills";

interface AgentToolbarProps {
  agents: Agent[];
  agentStatuses: Record<AgentType, AgentStatus>;
  addedSkills?: AddedSkill[];
  skillStatuses?: Record<string, AgentStatus>;
  onAddSkillClick?: () => void;
}

export function AgentToolbar({ agents, agentStatuses, addedSkills = [], skillStatuses = {}, onAddSkillClick }: AgentToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {agents.map((agent) => {
        const status = agentStatuses[agent.id] || "idle";
        return (
          <button
            key={agent.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 cursor-default"
            style={{
              background: agent.colorBg,
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
      {addedSkills.map((skill) => {
        const status = skillStatuses[skill.id] || "idle";
        return (
          <span
            key={skill.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-default transition-all duration-200"
            style={{
              background: skill.colorBg,
              color: skill.color,
              boxShadow:
                status === "thinking"
                  ? `0 0 12px ${skill.colorBg}`
                  : status === "done"
                    ? `0 0 8px ${skill.colorBg}`
                    : "none",
            }}
          >
            <span className={status === "thinking" ? "animate-agent-thinking" : ""}>
              {skill.icon}
            </span>
            <span>{skill.name}</span>
            {status === "thinking" && (
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-live" style={{ background: skill.color }} />
            )}
            {status === "done" && (
              <span className="text-[10px] opacity-70">✓</span>
            )}
          </span>
        );
      })}
      <button
        onClick={onAddSkillClick}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 cursor-pointer"
        style={{ background: "rgba(113,113,122,0.15)", color: "#71717a" }}
      >
        <span>+</span>
        <span>Add skill</span>
      </button>
    </div>
  );
}
