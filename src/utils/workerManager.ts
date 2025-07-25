import type { Position, AgentStatus, AgentStats, SimplifiedCell, SimplifiedBasin } from '../models/types';

// Worker Manager for handling communication with the simulation worker

// Define types
type WorkerMessageType =
  | 'CALCULATE_PATHS'
  | 'BATCH_AGENT_UPDATE';

// Simplified agent type for worker processing
export interface SimplifiedAgent {
  id: string;
  name: string;
  status: AgentStatus;
  stats: AgentStats;
  location: Position;
  daysSurvived: number;
  knownMap: Set<string>;
}

interface PathCalculationRequest {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  grid: {
    x: number;
    y: number;
    isWall: boolean;
  }[];
}

interface PathCalculationResponse {
  path: { x: number; y: number }[];
  id: string;
}

export interface BatchAgentUpdateRequest {
  agents: SimplifiedAgent[];
  cells: SimplifiedCell[][];
  basins: SimplifiedBasin[];
  day: number;
}

export interface BatchAgentUpdateResponse {
  updatedAgents: SimplifiedAgent[];
  updatedCells: SimplifiedCell[][];
  updatedBasins: SimplifiedBasin[];
  events: string[];
  id: string;
}

// Message sent to the worker
interface WorkerRequest {
  type: WorkerMessageType;
  payload: PathCalculationRequest | BatchAgentUpdateRequest;
  id: string;
}

interface WorkerResponse {
  path?: { x: number; y: number }[];
  updatedAgents?: SimplifiedAgent[];
  updatedCells?: SimplifiedCell[][];
  updatedBasins?: SimplifiedBasin[];
  events?: string[];
  id: string;
}

// Worker instance
let worker: Worker | null = null;

// Pending requests
const pendingRequests: Map<string, (response: WorkerResponse) => void> = new Map();

// Initialize worker
export function initWorker(): void {
  if (worker) return;
  
  try {
    worker = new Worker(new URL('./simulationWorker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id } = event.data;
      const callback = pendingRequests.get(id);
      
      if (callback) {
        callback(event.data);
        pendingRequests.delete(id);
      }
    };
    
    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };
  } catch (error) {
    console.error('Failed to initialize worker:', error);
  }
}

// Terminate worker
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

// Generate a unique ID for requests
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Send a message to the worker
function sendMessage<T>(
  type: WorkerMessageType,
  payload: PathCalculationRequest | BatchAgentUpdateRequest
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized'));
      return;
    }
    
    const id = generateRequestId();
    
    pendingRequests.set(id, (response) => {
      resolve(response as unknown as T);
    });
    
    const request: WorkerRequest = { type, payload, id };
    worker.postMessage(request);
  });
}

// Calculate path using worker
export function calculatePath(
  start: Position,
  end: Position,
  grid: { x: number; y: number; isWall: boolean }[]
): Promise<Position[]> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      initWorker();
    }
    
    sendMessage<PathCalculationResponse>('CALCULATE_PATHS', {
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      grid
    })
      .then((response) => {
        resolve(response.path || []);
      })
      .catch(reject);
  });
}

// Batch update agents using worker
export function batchUpdateAgents(
  agents: SimplifiedAgent[],
  cells: SimplifiedCell[][],
  basins: SimplifiedBasin[],
  day: number
): Promise<{
  updatedAgents: SimplifiedAgent[];
  updatedCells: SimplifiedCell[][];
  updatedBasins: SimplifiedBasin[];
  events: string[];
}> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      initWorker();
    }
    
    sendMessage<BatchAgentUpdateResponse>('BATCH_AGENT_UPDATE', {
      agents,
      cells,
      basins,
      day
    })
      .then((response) => {
        resolve({
          updatedAgents: response.updatedAgents || [],
          updatedCells: response.updatedCells || [],
          updatedBasins: response.updatedBasins || [],
          events: response.events || []
        });
      })
      .catch(reject);
  });
}

// Convert agent to simplified agent for worker
export function simplifyAgent(agent: {
  id: string;
  name: string;
  status: AgentStatus;
  stats: AgentStats;
  location: Position;
  daysSurvived: number;
  knownMap: Set<string>;
}): SimplifiedAgent {
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    stats: { ...agent.stats },
    location: { ...agent.location },
    daysSurvived: agent.daysSurvived,
    knownMap: new Set(agent.knownMap)
  };
}

// Apply updates from worker to agent
export function applyAgentUpdates(
  agent: {
    status: AgentStatus;
    stats: AgentStats;
    daysSurvived: number;
    knownMap: Set<string>;
  },
  updatedAgent: SimplifiedAgent
): void {
  agent.status = updatedAgent.status;
  agent.stats = { ...updatedAgent.stats };
  agent.daysSurvived = updatedAgent.daysSurvived;
  agent.knownMap = new Set(updatedAgent.knownMap);
}