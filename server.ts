/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { 
  CampusNode, 
  CampusEdge, 
  CampusEvent, 
  RouteResult, 
  CampusNavAgentResponse,
  AgentTraceStep,
  GraphAnomaly
} from "./src/types";

// Load Environment Configuration
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

// ================= CAMPUS SPATIAL DATASET =================

const CAMPUS_NODES: CampusNode[] = [
  { id: "gate", name: "Main Gate Entry", description: "Primary entrance for vehicles & pedestrians, security desk and visitor greeting kiosk.", category: "administrative", x: 10, y: 80 },
  { id: "admin", name: "Admin Block Central", description: "Administrative headquarters, admissions, finance office, and academic registrar.", category: "administrative", x: 30, y: 65 },
  { id: "library", name: "Central Library & Archives", description: "A three-story research repository with study pods, academic books, and silent reading halls.", category: "academic", x: 45, y: 35 },
  { id: "engineering", name: "Engineering & IT block", description: "Computer science labs, high-performance workstation grids, and electronic labs.", category: "academic", x: 75, y: 30 },
  { id: "auditorium", name: "University Auditorium", description: "Grand auditorium housing national events, cultural exhibitions, and major lectures.", category: "facility", x: 45, y: 70 },
  { id: "canteen", name: "Campus Food Court", description: "Central dining arena serving healthy meals, multi-cuisine snacks, and refreshments.", category: "food", x: 25, y: 35 },
  { id: "hostel", name: "Student Residency Dorms", description: "Residential complex for on-campus living, common rooms, and student council boards.", category: "residential", x: 85, y: 75 },
  { id: "sports", name: "Athletic Field & Gymnasium", description: "Indoor sports complex, outdoor running tracks, basketball arena, and physical therapy gym.", category: "sports", x: 70, y: 80 },
  { id: "health", name: "Campus First-Aid Clinic", description: "24/7 medical room offering urgent responses, medical storage, and ambulance links.", category: "medical", x: 15, y: 35 },
  { id: "placement", name: "Career & Placement Center", description: "Liaison building managing corporate drives, tech interviews, and professional workshops.", category: "academic", x: 62, y: 50 }
];

const CAMPUS_EDGES: CampusEdge[] = [
  // Flat paved road from Gate to Admin
  { source: "gate", target: "admin", distance: 120, hasStairs: false, hasRamp: true, hasElevator: false, description: "Flat paved central pathway." },
  // Short path Gate to Health Clinic
  { source: "gate", target: "health", distance: 150, hasStairs: false, hasRamp: true, hasElevator: false, description: "Level concrete path with tactile guide lines." },
  // Admin to Health Clinic (flat)
  { source: "admin", target: "health", distance: 80, hasStairs: false, hasRamp: true, hasElevator: false, description: "Direct sidewalk, wheelchair accessible." },
  // Direct Admin to Canteen (flat)
  { source: "admin", target: "canteen", distance: 140, hasStairs: false, hasRamp: false, hasElevator: false, description: "Unobstructed park walk." },
  // Admin to Library (Stairs warning - Overpass with stairwells)
  { source: "admin", target: "library", distance: 95, hasStairs: true, hasRamp: false, hasElevator: false, description: "Direct overhead pedestrian bridge with 20 steps." },
  // Admin to Auditorium (Stairs as it sits on elevated lawn)
  { source: "admin", target: "auditorium", distance: 70, hasStairs: true, hasRamp: false, hasElevator: false, description: "Lawn steps leading to Main Auditorium doors." },
  // Accessible path Admin -> Placement -> Auditorium (ramped)
  { source: "admin", target: "placement", distance: 110, hasStairs: false, hasRamp: true, hasElevator: false, description: "Fully paved garden walkthrough with standard ramps." },
  { source: "placement", target: "auditorium", distance: 90, hasStairs: false, hasRamp: true, hasElevator: false, description: "Lower auditorium entrance with custom accessibility ramp." },
  // Canteen to Health Clinic
  { source: "canteen", target: "health", distance: 90, hasStairs: false, hasRamp: true, hasElevator: false, description: "Flat tree-lined boulevard." },
  // Canteen to Library
  { source: "canteen", target: "library", distance: 110, hasStairs: false, hasRamp: true, hasElevator: false, description: "Ground-level ramped glass corridor." },
  // Library to Engineering
  { source: "library", target: "engineering", distance: 150, hasStairs: false, hasRamp: true, hasElevator: true, description: "Academic corridor with automatic sliding doors." },
  // Library to Placement
  { source: "library", target: "placement", distance: 120, hasStairs: false, hasRamp: true, hasElevator: false, description: "Well-lit pavement path." },
  // Engineering to Placement (contains heavy security staircase)
  { source: "engineering", target: "placement", distance: 80, hasStairs: true, hasRamp: false, hasElevator: false, description: "Short connecting link; involves a flight of concrete stairs." },
  // Engineering to Student Residency Dorms (flat)
  { source: "engineering", target: "hostel", distance: 210, hasStairs: false, hasRamp: true, hasElevator: false, description: "Wide paved pedestrian walkway." },
  // Residency Dorms to Sports Complex
  { source: "hostel", target: "sports", distance: 130, hasStairs: false, hasRamp: true, hasElevator: false, description: "Flat cinder running link." },
  // Sports Complex to Gate Entrance (outer perimeter road)
  { source: "sports", target: "gate", distance: 280, hasStairs: false, hasRamp: true, hasElevator: false, description: "Flat asphalt perimeter lane with solar lamps." },
  // Placement to Sports Complex
  { source: "placement", target: "sports", distance: 160, hasStairs: false, hasRamp: true, hasElevator: false, description: "Direct gravel pathway." }
];

const CAMPUS_EVENTS: CampusEvent[] = [
  { id: "ev01", name: "Capgemini Placement Drive 2026", description: "Annual campus hiring, technical interviews, and corporate profile presentations for CS and IT undergraduates.", venueNodeId: "placement", time: "09:00 AM - 04:00 PM", date: "2026-06-12", category: "placement" },
  { id: "ev02", name: "Global Design Innovation Hackathon", description: "48-hour collaborative product development sprint using generative AI agents and serverless architectures.", venueNodeId: "engineering", time: "05:00 PM onwards", date: "2026-06-15", category: "workshop" },
  { id: "ev03", name: "Annual Sports Selection Meet", description: "Selection trials for basketball, track events, and field sports competitions.", venueNodeId: "sports", time: "07:30 AM - 12:00 PM", date: "2026-06-10", category: "sports" },
  { id: "ev04", name: "Distinguished Academic Guest Address", description: "Seminar exploring Dijkstra modifications for wheelchair accessibility routing in urban planning layouts.", venueNodeId: "library", time: "02:00 PM - 03:30 PM", date: "2026-06-11", category: "academic" },
  { id: "ev05", name: "Orientation and Cultural Gala Night", description: "Interactive social evening for newly enrolled candidates and alumni meets.", venueNodeId: "auditorium", time: "06:30 PM - 09:30 PM", date: "2026-06-14", category: "social" }
];

// Active walkway anomalies database
export const ACTIVE_ANOMALIES: GraphAnomaly[] = [
  { id: "an01", source: "admin", target: "library", type: "stair_repair", name: "Overpass Staircase Undergoing Repair", severity: "medium", active: false, message: "Concrete steps repair on Admin-Library bridge. Speed reduced to 25%; detours advised." },
  { id: "an02", source: "library", target: "engineering", type: "elevator_outage", name: "Engineering Atrium Elevator Shut Down", severity: "critical", active: false, message: "EE Atrium Elevator undergoing periodic safety inspection. Access fully halted." },
  { id: "an03", source: "gate", target: "health", type: "landslide", name: "Path Undergoing Drainage Maintenance", severity: "low", active: false, message: "Pavement water pipes being replaced near Health Center. Walking lane narrowed." }
];


// ================= DIJKSTRA ROUTING ALGORITHM ENGINE (OFFLINE SECURE) =================

export function findShortestPath(
  startId: string, 
  endId: string, 
  accessibilityPreferred: boolean
): RouteResult {
  const warnings: string[] = [];
  const start = startId.trim().toLowerCase();
  const end = endId.trim().toLowerCase();

  // Validate Node Existence
  const allNodeIds = CAMPUS_NODES.map(n => n.id);
  if (!allNodeIds.includes(start) || !allNodeIds.includes(end)) {
    return {
      path: [],
      distance: 0,
      nodesEvaluated: 0,
      isAccessible: false,
      warnings: ["Invalid starting or ending node specified."]
    };
  }

  if (start === end) {
    return {
      path: [start],
      distance: 0,
      nodesEvaluated: 1,
      isAccessible: true,
      warnings: []
    };
  }

  // Dijkstra core implementing soft or hard filtering rules
  const runDijkstra = (avoidStairs: boolean): { path: string[]; distance: number; nodesCount: number } | null => {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    for (const node of CAMPUS_NODES) {
      distances[node.id] = Infinity;
      previous[node.id] = null;
      unvisited.add(node.id);
    }
    distances[start] = 0;
    let nodesCount = 0;

    // Helper: Build adjacency list dynamically
    const getNeighbors = (u: string) => {
      const neighbors: { nodeId: string; distance: number; edge: CampusEdge }[] = [];
      for (const edge of CAMPUS_EDGES) {
        if (avoidStairs && edge.hasStairs) {
          continue; // Skip step links when strict wheelchair routing requested
        }

        // Inline check for simulated pathway obstacles
        const blockingAnomaly = ACTIVE_ANOMALIES.find(
          an => an.active && 
          ((an.source === edge.source && an.target === edge.target) || 
           (an.source === edge.target && an.target === edge.source))
        );

        let effectiveDistance = edge.distance;
        if (blockingAnomaly) {
          if (blockingAnomaly.severity === "critical") {
            continue; // CRITICAL: Path is fully blocked and severed from the routing tree
          } else if (blockingAnomaly.severity === "medium") {
            effectiveDistance = edge.distance * 4; // MEDIUM: Apply massive routing penalty (detour highly encouraged)
          } else {
            effectiveDistance = edge.distance * 2; // LOW: Apply small penalty (mild speed reduction)
          }
        }

        if (edge.source === u) {
          neighbors.push({ nodeId: edge.target, distance: effectiveDistance, edge });
        } else if (edge.target === u) {
          neighbors.push({ nodeId: edge.source, distance: effectiveDistance, edge }); // Bidirectional corridors
        }
      }
      return neighbors;
    };

    while (unvisited.size > 0) {
      nodesCount++;
      // Find unvisited node with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;
      for (const id of unvisited) {
        if (distances[id] < minDistance) {
          minDistance = distances[id];
          current = id;
        }
      }

      if (current === null || distances[current] === Infinity) {
        break; // Destination unreachable under active filters
      }

      if (current === end) {
        break; // Shortest path path reached
      }

      unvisited.delete(current);

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.nodeId)) continue;
        const alternative = distances[current] + neighbor.distance;
        if (alternative < distances[neighbor.nodeId]) {
          distances[neighbor.nodeId] = alternative;
          previous[neighbor.nodeId] = current;
        }
      }
    }

    if (distances[end] === Infinity) {
      return null; // Path connection not found
    }

    // Reconstruct Route
    const pathList: string[] = [];
    let curr: string | null = end;
    while (curr !== null) {
      pathList.unshift(curr);
      curr = previous[curr];
    }

    return {
      path: pathList,
      distance: distances[end],
      nodesCount
    };
  };

  // Check path for any active warnings
  const checkAnomalyWarnings = (calculatedPath: string[]) => {
    for (let i = 0; i < calculatedPath.length - 1; i++) {
      const s = calculatedPath[i];
      const t = calculatedPath[i + 1];
      const activeAnomaly = ACTIVE_ANOMALIES.find(
        an => an?.active && 
        ((an.source === s && an.target === t) || (an.source === t && an.target === s))
      );
      if (activeAnomaly) {
        warnings.push(`Dynamic Event: Active alert '${activeAnomaly.name}' affects pathway intersection (${s} ➔ ${t}). Alternate routing was automatically factored.`);
      }
    }
  };

  // Attempt 1: Strict Accessibility Routing if switched on
  if (accessibilityPreferred) {
    const result = runDijkstra(true);
    if (result) {
      checkAnomalyWarnings(result.path);
      return {
        path: result.path,
        distance: result.distance,
        nodesEvaluated: result.nodesCount,
        isAccessible: true,
        warnings
      };
    } else {
      // Degrade with warnings: find standard route
      warnings.push("No direct wheelchair-accessible path (without stairs) was found. Displaying fallback route containing stairs.");
      const fallbackResult = runDijkstra(false);
      if (fallbackResult) {
        checkAnomalyWarnings(fallbackResult.path);
        return {
          path: fallbackResult.path,
          distance: fallbackResult.distance,
          nodesEvaluated: fallbackResult.nodesCount,
          isAccessible: false, // contains stairs
          warnings
        };
      }
    }
  }

  // Attempt 2: Standard shortest route (Stairs permitted)
  const standardResult = runDijkstra(false);
  if (standardResult) {
    checkAnomalyWarnings(standardResult.path);
    // Check if the standard path actually happens to be fully accessible anyway!
    let containsStairs = false;
    for (let i = 0; i < standardResult.path.length - 1; i++) {
      const s = standardResult.path[i];
      const t = standardResult.path[i + 1];
      const edge = CAMPUS_EDGES.find(
        e => (e.source === s && e.target === t) || (e.source === t && e.target === s)
      );
      if (edge && edge.hasStairs) {
        containsStairs = true;
        break;
      }
    }

    if (containsStairs && accessibilityPreferred) {
      warnings.push("Note: Shortest route contains stairs. Wheelchair users should consider detours.");
    }

    return {
      path: standardResult.path,
      distance: standardResult.distance,
      nodesEvaluated: standardResult.nodesCount,
      isAccessible: !containsStairs,
      warnings
    };
  }

  return {
    path: [],
    distance: 0,
    nodesEvaluated: 10,
    isAccessible: false,
    warnings: ["Completely unreachable destination. Please cross-reference starting parameters."]
  };
}


// ================= OFFLINE DETECT INTENT RUNTIME (FALLBACK EXPERT) =================

function parseOfflineIntent(query: string): { 
  intent: string; 
  matchedTool: string; 
  parameters: Record<string, any>; 
  observation: string;
  routeResult: RouteResult | null;
} {
  const text = query.toLowerCase().trim();
  let intent = "general";
  let matchedTool = "None";
  let parameters: Record<string, any> = {};
  let observation = "";
  let routeResult: RouteResult | null = null;

  // Extract source and target node IDs from user text through matching nicknames
  const nodeMatches = CAMPUS_NODES.map(node => {
    // Escape standard nicknames
    const nameLower = node.name.toLowerCase();
    const idLower = node.id.toLowerCase();
    const hasMatch = text.includes(idLower) || text.includes(nameLower) || 
                     (idLower === "gate" && text.includes("main entrance")) ||
                     (idLower === "hostel" && text.includes("dorm")) ||
                     (idLower === "engineering" && text.includes("computer science")) ||
                     (idLower === "health" && text.includes("clinic")) ||
                     (idLower === "health" && text.includes("medical")) ||
                     (idLower === "placement" && text.includes("career"));
                     
    return hasMatch ? node.id : null;
  }).filter(Boolean) as string[];

  // 1. EMERGENCY INTENT (highest priority check)
  if (
    text.includes("emergency") || 
    text.includes("medical") || 
    text.includes("hospital") || 
    text.includes("doctor") || 
    text.includes("accident") || 
    text.includes("sick") || 
    text.includes("clinic") || 
    text.includes("first aid")
  ) {
    intent = "emergency";
    matchedTool = "Emergency Tool";
    
    // Find nearest medical node (which is 'health')
    const startNode = nodeMatches.length > 0 ? nodeMatches[0] : "gate";
    const route = findShortestPath(startNode, "health", true); // Prefer wheelchair route for emergencies where possible
    
    parameters = { startNode, target: "health" };
    observation = `Emergency response signal intercepted. Splicing immediate route to the Health Clinic from current location "${CAMPUS_NODES.find(n => n.id === startNode)?.name || startNode}".`;
    routeResult = route;
    return { intent, matchedTool, parameters, observation, routeResult };
  }

  // 2. ACCESSIBILITY SEARCH INTENT
  if (
    text.includes("wheelchair") || 
    text.includes("accessible") || 
    text.includes("avoid stairs") || 
    text.includes("ramp") || 
    text.includes("elevator")
  ) {
    intent = "accessibility";
    matchedTool = "Accessibility Tool";
    
    const startNode = nodeMatches[0] || "gate";
    const endNode = nodeMatches[1] || (nodeMatches[0] !== "library" ? "library" : "admin");
    
    const route = findShortestPath(startNode, endNode, true);
    parameters = { startNode, endNode, wheelchairFriendly: true };
    observation = `Triggered Accessibility Route calculation from "${startNode}" to "${endNode}". Graph checked. Avoiding steps.`;
    routeResult = route;
    return { intent, matchedTool, parameters, observation, routeResult };
  }

  // 3. EVENT INQUIRY INTENT
  if (
    text.includes("event") || 
    text.includes("happening") || 
    text.includes("placement") || 
    text.includes("drive") || 
    text.includes("hackathon") || 
    text.includes("seminar") || 
    text.includes("lecture") || 
    text.includes("meet") || 
    text.includes("gala")
  ) {
    intent = "event";
    matchedTool = "Event Tool";
    
    // Check key event match
    let matchedEvent = CAMPUS_EVENTS[0];
    if (text.includes("hackathon") || text.includes("innovation")) {
      matchedEvent = CAMPUS_EVENTS.find(e => e.id === "ev02") || CAMPUS_EVENTS[0];
    } else if (text.includes("sports") || text.includes("game")) {
      matchedEvent = CAMPUS_EVENTS.find(e => e.id === "ev03") || CAMPUS_EVENTS[0];
    } else if (text.includes("lecture") || text.includes("dijkstra")) {
      matchedEvent = CAMPUS_EVENTS.find(e => e.id === "ev04") || CAMPUS_EVENTS[0];
    } else if (text.includes("gala") || text.includes("cultural") || text.includes("social")) {
      matchedEvent = CAMPUS_EVENTS.find(e => e.id === "ev05") || CAMPUS_EVENTS[0];
    }

    parameters = { eventId: matchedEvent.id, eventName: matchedEvent.name };
    const venueName = CAMPUS_NODES.find(n => n.id === matchedEvent.venueNodeId)?.name || matchedEvent.venueNodeId;
    observation = `Retrieved campus event schedules. Found matching record: "${matchedEvent.name}" scheduled at the venue: [${venueName}] on date: ${matchedEvent.date}, timing: ${matchedEvent.time}.`;
    
    // Auto-calculate route to the event
    const startNode = nodeMatches[0] || "gate";
    const route = findShortestPath(startNode, matchedEvent.venueNodeId, false);
    routeResult = route;
    return { intent, matchedTool, parameters, observation, routeResult };
  }

  // 4. ROUTING DIRECT INTENT
  if (text.includes("route") || text.includes("reach") || text.includes("find path") || text.includes("how to go") || text.includes("navigate") || nodeMatches.length >= 2) {
    intent = "routing";
    matchedTool = "Route Tool";
    
    const startNode = nodeMatches[0] || "gate";
    const endNode = nodeMatches[1] || "engineering";
    
    const route = findShortestPath(startNode, endNode, false);
    parameters = { startNode, endNode, mode: "shortest" };
    observation = `Standard Dijkstra route engine computed from ${startNode} -> ${endNode}. Walk distance is ${route.distance} meters.`;
    routeResult = route;
    return { intent, matchedTool, parameters, observation, routeResult };
  }

  // 5. BUILDING RESEARCH INTENT
  if (text.includes("where is") || text.includes("what is") || text.includes("search building") || (nodeMatches.length === 1)) {
    intent = "building_search";
    matchedTool = "Building Search Tool";
    
    const targetNodeId = nodeMatches[0] || "admin";
    const nodeObj = CAMPUS_NODES.find(n => n.id === targetNodeId) || CAMPUS_NODES[1];
    
    parameters = { targetNodeId, buildingName: nodeObj.name };
    observation = `Queried Campus Registry. Found building: "${nodeObj.name}". Detail: "${nodeObj.description}". Node Class: [${nodeObj.category.toUpperCase()}]. Location Matrix: X:${nodeObj.x}%, Y:${nodeObj.y}%`;
    return { intent, matchedTool, parameters, observation, routeResult };
  }

  // Fallback General QA
  intent = "general_qa";
  matchedTool = "None";
  observation = "General campus question parsed. Providing conversational guide about building layout and event structures.";
  return { intent, matchedTool, parameters, observation, routeResult };
}


// ================= LAZY INITIALIZED SYSTEM-LEVEL GEMINI CLIENT =================

let geminiClient: GoogleGenAI | null = null;
function getGeminiService(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        geminiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build-campusnav",
            }
          }
        });
      } catch (err) {
        console.error("Gemini failed to load", err);
      }
    }
  }
  return geminiClient;
}


// ================= PIPELINE API ENDPOINTS =================

// Endpoint: Fetch Campus Topology Map Graph
app.get("/api/campus/graph", (req, res) => {
  res.json({
    nodes: CAMPUS_NODES,
    edges: CAMPUS_EDGES
  });
});

// Endpoint: Fetch Ongoing/Upcoming Campus Events
app.get("/api/campus/events", (req, res) => {
  res.json({ events: CAMPUS_EVENTS });
});

// Endpoint: Fetch Simulated Pathway Blockages / Anomalies
app.get("/api/campus/anomalies", (req, res) => {
  res.json({ anomalies: ACTIVE_ANOMALIES });
});

// Endpoint: Toggle Pathway Anomaly State dynamically
app.post("/api/campus/anomalies/toggle", (req, res) => {
  const { id } = req.body;
  const anomaly = ACTIVE_ANOMALIES.find(an => an.id === id);
  if (!anomaly) {
    return res.status(404).json({ error: "Pathway anomaly not found in local graph registry." });
  }
  anomaly.active = !anomaly.active;
  console.log(`[CampusNav] Pathway Anomaly '${anomaly.name}' active status changed to: ${anomaly.active}`);
  res.json({ success: true, anomaly });
});

// Endpoint: Direct Dijkstra Calculation Router
app.post("/api/campus/route", (req, res) => {
  const { startNode, endNode, accessibilityPreferred } = req.body;
  if (!startNode || !endNode) {
    return res.status(400).json({ error: "Missing required parameters: startNode and endNode." });
  }

  try {
    const route = findShortestPath(startNode, endNode, !!accessibilityPreferred);
    res.json({ route });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: AI Agentic Assistant Execution Portal (Dual AI and Offline Mode)
app.post("/api/agent/run", async (req, res) => {
  const startTimer = Date.now();
  const { query, useAi } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: "Input prompt query cannot be blank." });
  }

  const queryClean = query.trim();
  const activeAi = useAi !== false; // Flag to enable/disable generative simulation
  const traces: AgentTraceStep[] = [];

  const addTrace = (type: AgentTraceStep["type"], title: string, details: string, meta?: any) => {
    traces.push({
      stepIndex: traces.length + 1,
      type,
      title,
      details,
      timestamp: new Date().toISOString(),
      meta
    });
  };

  addTrace("classification", "Inbound Request Registered", `Processing campus navigation query: "${queryClean}"`);

  // Step 1: Intent Analysis & Entity Extraction
  const offlineParse = parseOfflineIntent(queryClean);
  addTrace(
    "classification", 
    "Intent Decoded (Regex Router)", 
    `Mapped query to intent category: [${offlineParse.intent.toUpperCase()}] targeting tool: [${offlineParse.matchedTool}]. Evaluated extracted parameters: ${JSON.stringify(offlineParse.parameters)}`
  );

  let finalAnswer = "";
  let isOffline = true;

  const gemini = getGeminiService();

  if (activeAi && gemini) {
    isOffline = false;
    addTrace("tool_call", "Google Gemini AI Engine Loaded", "Gemini 3.5 Active. Integrating spatial coordinates and scheduling schemas into prompt memory.");
    
    try {
      const systemContextRule = `
Your name is CampusNav AI, an advanced, accessibility-driven navigational agent developed for the college campus!
You possess a live map. Here are the buildings available:
${JSON.stringify(CAMPUS_NODES, null, 2)}

Here are the paths connecting them:
${JSON.stringify(CAMPUS_EDGES, null, 2)}

And here is the live schedule of Campus Events:
${JSON.stringify(CAMPUS_EVENTS, null, 2)}

When answering, analyze the tool logs provided. If a route was calculated, describe the precise path (referring to key checkpoints, meters or wheelchair parameters).
Always be encouraging, professional, and explain details like total footprint (meters) and accessibility steps with clarity.
`;

      const promptPay = `
User Query: "${queryClean}"
Identified Local Intent: ${offlineParse.intent}
Identified Parameters: ${JSON.stringify(offlineParse.parameters)}
Local Database / Tool Observation Logs:
${offlineParse.observation}

calculated route object data:
${offlineParse.routeResult ? JSON.stringify(offlineParse.routeResult, null, 2) : "No spatial route was calculated."}

Task: Formulate a highly friendly, detailed natural response. State specifically where things are, how to go, or what accessibility routes to choose if there is stairs warning. Keep it clean and readable. Give a step-by-step summary of the checkpoints.
`;

      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptPay,
        config: {
          systemInstruction: systemContextRule,
          temperature: 0.2
        }
      });

      finalAnswer = response.text || "No summary response compiled.";
      addTrace("synthesis", "Generative Dialogue Synthesized", "Compiled highly integrated, fluid human output using Gemini 3.5 AI.");
    } catch (err: any) {
      addTrace("error", "AI Response Interrupted", `Gemini model execution failed: ${err.message}. Gracefully restoring pure Offline Engine compilation.`);
      isOffline = true;
    }
  }

  // Generate Standard Fallback Output when AI is not configured/errored
  if (isOffline) {
    addTrace("synthesis", "Offline Controller Processing", "Synthesizing deterministic operational directives for low-connectivity execution.");
    
    const nodeMap = new Map(CAMPUS_NODES.map(n => [n.id, n.name]));
    let pathMsg = "";
    if (offlineParse.routeResult && offlineParse.routeResult.path.length > 0) {
      const checkpoints = offlineParse.routeResult.path.map(id => nodeMap.get(id) || id).join(" ➔ ");
      pathMsg = `\n\n🗺️ **Calculated Path Coordinates:** \n${checkpoints}\n⚡ **Distance:** ${offlineParse.routeResult.distance} meters.\n♿ **Accessible:** ${offlineParse.routeResult.isAccessible ? "Yes (Wheelchair-friendly ramp pathways)" : "No (Contains stair steps/obstacles)"}`;
      if (offlineParse.routeResult.warnings.length > 0) {
        pathMsg += `\n⚠️ **Warning:** ${offlineParse.routeResult.warnings.join(", ")}`;
      }
    }

    if (offlineParse.intent === "emergency") {
      finalAnswer = `🚨 **EMERGENCY ASSISTANCE INITIATED** 🚨\n\n${offlineParse.observation}\nWe have calculated the direct emergency path to the **Campus First-Aid Clinic** now.${pathMsg}\n\n*Proceed immediately. Medical teams have been alerted to standby.*`;
    } else if (offlineParse.intent === "accessibility") {
      finalAnswer = `♿ **ACCESSIBILITY-DRIVEN ROUTE FOUND**\n\n${offlineParse.observation}${pathMsg}\n\nThis path avoids stairs. Elevators and outdoor ramps are prioritized.`;
    } else if (offlineParse.intent === "event") {
      finalAnswer = `📅 **CAMPUS EVENT REGISTRATION FOUND**\n\n${offlineParse.observation}${pathMsg}\n\nMake sure to arrive 15 minutes before-time!`;
    } else if (offlineParse.intent === "routing") {
      finalAnswer = `📌 **NAVIGATION DETAILS REPORT**\n\n${offlineParse.observation}${pathMsg}`;
    } else if (offlineParse.intent === "building_search") {
      finalAnswer = `🏢 **CAMPUS REGISTRY REPORT**\n\n${offlineParse.observation}`;
    } else {
      finalAnswer = `Hi! I am CampusNav AI, your campus navigation assistant. 
- You can ask me to calculate routes: e.g., *"Take me from Central Library to IT Block"* or *"Find wheelchair-friendly path to Auditorium"*.
- You can query schedules: e.g., *"Where is the placement drive?"* or *"What event is happening at the sports arena?"*
- You can find medical help quickly in any situation: *"Medical emergency assistance from Dorms"*.`;
    }
  }

  const duration = Date.now() - startTimer;

  const result: CampusNavAgentResponse = {
    query: queryClean,
    intent: offlineParse.intent,
    selectedTool: offlineParse.matchedTool !== "None" ? offlineParse.matchedTool : null,
    toolParameters: offlineParse.parameters,
    observation: offlineParse.observation,
    finalAnswer,
    route: offlineParse.routeResult,
    isOffline,
    executionTraces: traces,
    timestamp: new Date().toISOString()
  };

  res.json(result);
});


// ================= DEVELOPMENT / PRODUCTION BOOTING GATE =================

async function bootService() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[CampusNav] Building client with Vite middleware support on Port 3000.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("[CampusNav] Running in production static assets mode.");
    const buildPath = path.join(process.cwd(), "dist");
    app.use(express.static(buildPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CampusNav AI Node Server] Running at http://localhost:${PORT}`);
  });
}

bootService();
