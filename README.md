# FlyAI

An open-source, AI-powered personal travel assistant built on [Fliggy MCP](https://github.com/anthropics/model-context-protocol). FlyAI orchestrates specialized agents — search, flights, hotels, attractions, and more — to help you plan trips through natural conversation.

## What FlyAI Does

Ask a question like *"Plan a 5-day trip to Kyoto"* and FlyAI dispatches multiple agents in parallel to find flights, hotels, and attractions, then assembles the results into a single, coherent answer. It supports both English and Chinese queries out of the box.

**Built-in agents today:**

| Agent | What it does |
|-------|-------------|
| 🔍 Search | Broad natural-language travel search |
| ✈️ Flights | Search and compare flight prices |
| 🏨 Hotels | Find and compare accommodations |
| 🎭 Attractions | Discover local points of interest |

## Project Scope

FlyAI aims to be a **complete personal travel assistant** that covers the full travel lifecycle:

- **Discovery** — explore destinations, events, and experiences
- **Planning** — build itineraries with real availability and pricing
- **Booking** — connect directly to booking flows for flights, hotels, tickets, and more
- **On-trip** — real-time info like weather, transport, and local recommendations

The architecture is agent-based and modular. Each capability is an independent agent that can be developed, tested, and deployed on its own.

## Open Source & Community

FlyAI is fully open source under the MIT license. We believe the best travel assistant should be built by travelers, developers, and the community together — not locked behind a single company's product decisions.

**We're actively looking for contributors to build new skills and agents**, for example:

- 🚄 **Train / Rail** — search rail schedules and prices
- 🚗 **Car Rental** — compare rental options across providers
- 🌤️ **Weather** — destination weather forecasts for trip dates
- 📋 **Itinerary Builder** — auto-generate day-by-day plans
- 🍜 **Restaurants** — local dining recommendations and reservations
- 🎫 **Events** — concerts, sports, festivals happening at your destination
- 🛂 **Visa & Travel Docs** — entry requirements and document checklists
- 💱 **Currency & Budget** — exchange rates and trip budget tracking
- 🗣️ **Language** — key phrases and real-time translation for your destination
- 🧳 **Packing** — smart packing lists based on destination and weather

…or anything else that makes travel easier. If you've ever thought *"I wish my travel app could do X"*, this is your chance to build it.

## Design Principles

**Native, conversational, and generative.** Inputs are natural language, not dropdowns and date pickers. Outputs are AI-generated and context-aware, not templated. Content recommendations are proactive — surfaced before you even ask.

**Intent-driven agent routing.** Instead of static category icons, FlyAI dynamically routes agents and skills based on what the user actually wants. Flights and hotels search becomes a high-frequency agent; one-click booking from an official account becomes a long-tail skill. This model replaces 8 static icons with 800+ dynamic agents, unlocking hyper-personalized experiences.

**An open, borderless ecosystem.** The agent and skill ecosystem scales across travel, mobility, and the broader consumer market. Every user has the freedom to add their preferred skills or agents from any marketplace of their choosing — no walled gardens.

**The ultimate entry point and cloud infrastructure.** As long as the underlying layer of skills runs on our supply chain, services, payments, and infrastructure, we win. The more open the ecosystem, the stronger our foundation becomes.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/alibaba-flyai/flyai.git
cd flyai

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting.

## Contributing

We welcome contributions of all kinds — new agents, UI improvements, bug fixes, docs, and ideas.

1. **Fork** the repo and create a feature branch
2. **Build** your agent or feature (see `src/lib/agents.ts` and `src/lib/types.ts` for the agent interface)
3. **Test** locally with `npm run dev`
4. **Open a PR** with a clear description of what your agent does and how to use it

If you're not sure where to start, check the [Issues](https://github.com/alibaba-flyai/flyai/issues) for ideas or open a discussion.

## Tech Stack

- [Next.js](https://nextjs.org) — React framework
- [Fliggy MCP](https://github.com/anthropics/model-context-protocol) — travel service backend
- TypeScript — end to end

## License

MIT
