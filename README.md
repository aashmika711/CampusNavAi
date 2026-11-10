# CampusNav AI — Smart Campus Navigation & Accessibility Agent

An advanced, full-stack spatial navigation dashboard and Agentic AI assistant customized to conquer campus exploration friction. This workspace incorporates real-time pathfinding algorithms, smart intent decomposition tools, event location relays, and interactive responsive mapping panels.

---

## 🚀 Key Functional Modules

1. **Dashboard & Topology Overview**: High-resolution metrics and indicators summary tracking active nodes, accessibility density ratios, and ongoing campus highlights.
2. **Offline Dijkstra Navigation**: Local spatial graph-traversal implementation calculating the absolute shortest path while seamlessly tracking accessibility boundaries.
3. **Accessibility Pathway Filter**: Wheelchair-driven path routing that detects and bypasses outdoor stairways or indoor climbs, prioritizing ramps and automatic entrances.
4. **Agentic Conversational Core**: Dual-engine compiler utilizing server-side Gemini 3.5 generative structures or local deterministic Regex pattern matching to route prompts autonomously.
5. **Quick-Strike Emergency Compass**: Single-click locator calculating immediate hazard-free routing from any block to the Campus First-Aid Clinic.

---

## 🛠️ Graph Architecture Details

Our campus layout is mapped onto a bidirectional geographic coordinates matrix:
- **10 Core Hub Blocks**: Main Entrance, Admin Block, Central Library, IT Labs, Food Court, Sports Gym, Medical Center, Audiorium, Residency Hostel, and Placement Center.
- **17 Walkway Corridors**: Weighted edges incorporating step obstacles (`hasStairs`), structural elevators (`hasElevator`), and paving specifications.

---

## 💻 Running the Application

### Installation & Initialization
Standard Node modules manage the application server and asset bundles:
```bash
# Install core dependencies
npm install

# Start local server or Vite client-development middleware
npm run dev
```

### Production Bundling
Compile the React frontend client and pack the Express server endpoint for deployment:
```bash
npm run build
```

---
*Created as an elite operational submission for the Capgemini Agentic AI Buildathon Deep Dive.*
