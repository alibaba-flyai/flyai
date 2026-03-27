export type AgentType = "fast-search" | "hotel" | "flight" | "poi";

export type AgentStatus = "idle" | "thinking" | "done" | "error";

export interface Agent {
  id: AgentType;
  name: string;
  command: string;
  icon: string;
  color: string;
  colorBg: string;
  description: string;
}

// flyai API response shape
export interface FlyaiResponse {
  status: number;
  message: string;
  data: {
    itemList: unknown[];
  };
}

// fliggy-fast-search item
export interface FastSearchItem {
  info: {
    jumpUrl: string;
    picUrl: string;
    price: string;
    scoreDesc: string;
    star: string;
    tags: string[];
    title: string;
  };
}

// search-flight item
export interface FlightItem {
  ticketPrice: string;
  adultPrice?: string;
  journeys: {
    journeyType: string;
    segments: {
      depCityCode: string;
      depCityName: string;
      depStationName: string;
      depDateTime: string;
      arrCityCode: string;
      arrCityName: string;
      arrStationName: string;
      arrDateTime: string;
      duration: string;
      marketingTransportName: string;
      marketingTransportNo: string;
      seatClassName: string;
    }[];
    totalDuration: string;
  }[];
  jumpUrl: string;
  totalDuration: string;
}

// search-hotels item
export interface HotelItem {
  address: string;
  brandName: string;
  decorationTime: string;
  interestsPoi: string;
  mainPic: string;
  detailUrl: string;
  name: string;
  price: string;
  review: string;
  score: string;
  scoreDesc: string;
  star: string;
}

// search-poi item
export interface PoiItem {
  address: string;
  id: string;
  category: string;
  poiLevel: string;
  mainPic: string;
  jumpUrl: string;
  name: string;
  freePoiStatus: "FREE" | "NOT_FREE" | "UNKNOWN";
  ticketInfo?: {
    price: string | null;
    priceDate: string;
    ticketName: string;
  };
}

export interface AgentResult {
  agentId: AgentType;
  items: unknown[];
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: AgentResult[];
  activeAgents?: AgentType[];
}
