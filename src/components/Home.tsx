"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatInput } from "@/components/ChatInput";
import { AgentToolbar } from "@/components/AgentToolbar";
import { FastSearchCard, FlightCard, HotelCard, PoiCard } from "@/components/AgentCards";
import { agents, detectAgents, buildParams, getAgent } from "@/lib/agents";
import { AgentType, AgentStatus, AgentResult, ChatMessage, FastSearchItem, FlightItem, HotelItem, PoiItem } from "@/lib/types";

const initialStatuses: Record<AgentType, AgentStatus> = {
  "fast-search": "idle",
  hotel: "idle",
  flight: "idle",
  poi: "idle",
};

async function callAgent(agentId: AgentType, query: string): Promise<AgentResult> {
  const agent = getAgent(agentId);
  if (!agent) return { agentId, items: [], error: "Agent not found" };

  const params = buildParams(agentId, query);

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: agent.command, params }),
    });

    const data = await res.json();

    if (data.error) {
      return { agentId, items: [], error: data.error };
    }

    return { agentId, items: data.data?.itemList || [] };
  } catch (err) {
    return { agentId, items: [], error: String(err) };
  }
}

function ResultCards({ result }: { result: AgentResult }) {
  if (result.error) {
    return (
      <div className="text-xs text-[var(--color-muted)] px-3 py-2 rounded-lg"
        style={{ background: "var(--color-card)" }}>
        {getAgent(result.agentId)?.icon} {result.error}
      </div>
    );
  }

  if (result.items.length === 0) return null;

  switch (result.agentId) {
    case "fast-search":
      return <>{(result.items as FastSearchItem[]).slice(0, 6).map((item, i) => <FastSearchCard key={i} item={item} />)}</>;
    case "flight":
      return <>{(result.items as FlightItem[]).slice(0, 4).map((item, i) => <FlightCard key={i} item={item} />)}</>;
    case "hotel":
      return <>{(result.items as HotelItem[]).slice(0, 4).map((item, i) => <HotelCard key={i} item={item} />)}</>;
    case "poi":
      return <>{(result.items as PoiItem[]).slice(0, 4).map((item, i) => <PoiCard key={i} item={item} />)}</>;
  }
}

export function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentStatuses, setAgentStatuses] = useState(initialStatuses);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(async (userMessage: string) => {
    setIsProcessing(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };

    const activeAgentIds = detectAgents(userMessage);

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      activeAgents: activeAgentIds,
      results: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    // Set all active agents to thinking
    setAgentStatuses((prev) => {
      const next = { ...prev };
      for (const id of activeAgentIds) next[id] = "thinking";
      return next;
    });

    // Dispatch all agents in parallel
    const promises = activeAgentIds.map(async (agentId) => {
      const result = await callAgent(agentId, userMessage);

      // Update status
      setAgentStatuses((prev) => ({
        ...prev,
        [agentId]: result.error ? "error" : "done",
      }));

      // Append result to assistant message
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.results = [...(last.results || []), result];
        }
        return [...updated];
      });

      return result;
    });

    await Promise.all(promises);
    setIsProcessing(false);

    // Reset statuses after a moment
    setTimeout(() => setAgentStatuses(initialStatuses), 3000);
  }, []);

  const hasMessages = messages.length > 0;

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
          <button onClick={() => { setMessages([]); setAgentStatuses(initialStatuses); setIsProcessing(false); }} className="text-xl font-bold cursor-pointer">
            <span style={{ color: "var(--color-accent)" }}>fly</span>
            <span style={{ color: "var(--color-foreground)" }}>.ai</span>
          </button>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono"
            style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>
            alpha
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--color-muted)]">{agents.length} agents</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)" }}>
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
                  Where to <span style={{ color: "var(--color-accent)" }}>next</span>?
                </h1>
                <p className="text-sm text-[var(--color-muted)]">
                  Just think out loud. Your agents will handle the rest.
                </p>
              </div>

              <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />

              <div className="mt-4 flex justify-center">
                <AgentToolbar agents={agents} agentStatuses={agentStatuses} />
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  "杭州三日游",
                  "北京到上海的机票",
                  "三亚酒店推荐",
                  "西安有什么好玩的景点",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSubmit(suggestion)}
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
                ))}
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
                    {/* Active agents indicator */}
                    {msg.activeAgents && msg.activeAgents.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "var(--color-accent)", color: "#fff" }}>
                          f
                        </div>
                        <AgentToolbar agents={agents.filter(a => msg.activeAgents!.includes(a.id))} agentStatuses={agentStatuses} />
                      </div>
                    )}

                    {/* Agent result cards */}
                    {msg.results && msg.results.length > 0 && (
                      <div className="ml-8 space-y-4">
                        {msg.results.map((result, i) => (
                          <div key={`${result.agentId}-${i}`}
                            className={
                              result.agentId === "flight"
                                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                                : "grid grid-cols-1 md:grid-cols-2 gap-3"
                            }>
                            <ResultCards result={result} />
                          </div>
                        ))}
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
        <div className="border-t px-4 py-4" style={{ borderColor: "var(--color-card-border)", background: "rgba(10,10,18,0.9)" }}>
          <div className="max-w-4xl mx-auto space-y-3">
            <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />
            <div className="flex justify-center">
              <AgentToolbar agents={agents} agentStatuses={agentStatuses} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
