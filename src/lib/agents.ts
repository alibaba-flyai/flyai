import { Agent, AgentType } from "./types";

export const agents: Agent[] = [
  {
    id: "fast-search",
    name: "Search",
    command: "fliggy-fast-search",
    icon: "🔍",
    color: "#3b82f6",
    colorBg: "rgba(59,130,246,0.15)",
    description: "Natural language travel search",
  },
  {
    id: "hotel",
    name: "Hotels",
    command: "search-hotels",
    icon: "🏨",
    color: "#a855f7",
    colorBg: "rgba(168,85,247,0.15)",
    description: "Search and compare hotels",
  },
  {
    id: "flight",
    name: "Flights",
    command: "search-flight",
    icon: "✈️",
    color: "#06b6d4",
    colorBg: "rgba(6,182,212,0.15)",
    description: "Search flights and prices",
  },
  {
    id: "poi",
    name: "Attractions",
    command: "search-poi",
    icon: "🎭",
    color: "#f97316",
    colorBg: "rgba(249,115,22,0.15)",
    description: "Discover local attractions",
  },
];

export function getAgent(id: AgentType): Agent | undefined {
  return agents.find((a) => a.id === id);
}

// Determine which agents to dispatch based on user query
export function detectAgents(query: string): AgentType[] {
  const q = query.toLowerCase();
  const active: AgentType[] = [];

  // Always run fast-search for broad discovery
  active.push("fast-search");

  // Flight-specific keywords
  if (/flight|fly|airfare|airline|机票|航班/.test(q)) {
    active.push("flight");
  }

  // Hotel-specific keywords
  if (/hotel|stay|accommodation|resort|hostel|酒店|住宿|民宿/.test(q)) {
    active.push("hotel");
  }

  // POI/attraction keywords
  if (/visit|see|attraction|temple|museum|景点|景区|游玩/.test(q)) {
    active.push("poi");
  }

  // If no specific agents detected, run all for broad queries
  if (active.length === 1) {
    active.push("hotel", "poi");
  }

  return active;
}

// Build CLI params from user query for each agent type
export function buildParams(agentId: AgentType, query: string): Record<string, string> {
  switch (agentId) {
    case "fast-search":
      return { query };
    case "flight": {
      // Try to extract origin/destination from query, fallback to query as origin
      const cities = extractCities(query);
      return {
        origin: cities.origin || query,
        ...(cities.destination ? { destination: cities.destination } : {}),
      };
    }
    case "hotel": {
      const dest = extractDestination(query);
      return { "dest-name": dest };
    }
    case "poi": {
      const city = extractDestination(query);
      return { "city-name": city };
    }
  }
}

// Simple city extraction — in production this would use NLP
function extractCities(query: string): { origin?: string; destination?: string } {
  // Pattern: "from X to Y" or "X to Y"
  const fromTo = query.match(/(?:from\s+)?(\w+[\w\s]*?)\s+to\s+(\w+[\w\s]*?)(?:\s|$|,)/i);
  if (fromTo) {
    return { origin: fromTo[1].trim(), destination: fromTo[2].trim() };
  }

  // Chinese pattern: X到Y or X去Y
  const zhPattern = query.match(/([\u4e00-\u9fff]+)[到去]([\u4e00-\u9fff]+)/);
  if (zhPattern) {
    return { origin: zhPattern[1], destination: zhPattern[2] };
  }

  // Single city mentioned
  const city = extractDestination(query);
  return { origin: city };
}

function extractDestination(query: string): string {
  // Known city names (expand as needed)
  const cities = [
    "Tokyo", "Kyoto", "Osaka", "Paris", "London", "New York", "Bangkok", "Seoul",
    "Singapore", "Bali", "Barcelona", "Rome", "Dubai", "Istanbul", "Oaxaca",
    "杭州", "上海", "北京", "三亚", "成都", "西安", "广州", "深圳", "南京",
    "苏州", "厦门", "大理", "丽江", "拉萨", "桂林", "重庆", "武汉", "长沙",
    "Hangzhou", "Shanghai", "Beijing", "Sanya", "Chengdu", "Xian",
  ];

  for (const city of cities) {
    if (query.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }

  // Fallback: use the whole query
  return query.replace(/[?!.。？！]/g, "").trim();
}
