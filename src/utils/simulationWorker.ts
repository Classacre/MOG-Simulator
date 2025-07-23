// Web Worker for handling heavy computations
// This prevents UI blocking during intensive operations

// Define message types
type WorkerMessageType = 
  | 'CALCULATE_PATHS'
  | 'BATCH_AGENT_UPDATE';

interface WorkerMessage {
  type: WorkerMessageType;
  payload: PathCalculationRequest | BatchAgentUpdateRequest;
  id: string; // For tracking responses
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

// Simplified agent type for worker processing
interface SimplifiedAgent {
  id: string;
  name: string;
  status: 'alive' | 'injured' | 'dead';
  stats: {
    health: number;
    hunger: number;
    thirst: number;
    energy: number;
    morale: number;
  };
  location: { x: number; y: number };
  daysSurvived: number;
}

interface BatchAgentUpdateRequest {
  agents: SimplifiedAgent[]; // Simplified agent data
  day: number;
}

interface BatchAgentUpdateResponse {
  updatedAgents: SimplifiedAgent[];
  events: string[];
  id: string;
}

// Handle messages from the main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = event.data;
  
  switch (type) {
    case 'CALCULATE_PATHS':
      handlePathCalculation(payload as PathCalculationRequest, id);
      break;
    case 'BATCH_AGENT_UPDATE':
      handleBatchAgentUpdate(payload as BatchAgentUpdateRequest, id);
      break;
    default:
      console.error('Unknown message type:', type);
  }
};

// Handle path calculation requests
function handlePathCalculation(request: PathCalculationRequest, id: string): void {
  const { startX, startY, endX, endY, grid } = request;
  
  // Convert grid to a 2D array for easier processing
  const gridMap: boolean[][] = [];
  const width = Math.max(...grid.map(cell => cell.x)) + 1;
  const height = Math.max(...grid.map(cell => cell.y)) + 1;
  
  // Initialize grid with all walls
  for (let y = 0; y < height; y++) {
    gridMap[y] = [];
    for (let x = 0; x < width; x++) {
      gridMap[y][x] = true; // Default to wall
    }
  }
  
  // Set non-wall cells
  grid.forEach(cell => {
    if (!cell.isWall && cell.y < height && cell.x < width) {
      gridMap[cell.y][cell.x] = false;
    }
  });
  
  // Calculate path using A* algorithm
  const path = findPath(
    { x: startX, y: startY },
    { x: endX, y: endY },
    gridMap
  );
  
  // Send result back to main thread
  const response: PathCalculationResponse = {
    path,
    id
  };
  
  self.postMessage(response);
}

// Handle batch agent update requests
function handleBatchAgentUpdate(request: BatchAgentUpdateRequest, id: string): void {
  const { agents, day } = request;
  
  // Process agents in batches
  const updatedAgents = agents.map(agent => {
    // Simplified agent update logic
    if (agent.status === 'dead') return agent;
    
    // Update stats
    agent.stats.hunger = Math.max(0, agent.stats.hunger - 10);
    agent.stats.thirst = Math.max(0, agent.stats.thirst - 15);
    
    // Check if agent dies from hunger/thirst
    if (agent.stats.hunger <= 0 || agent.stats.thirst <= 0) {
      agent.stats.health = Math.max(0, agent.stats.health - 15);
    }
    
    // Update status based on health
    if (agent.stats.health <= 0) {
      agent.status = 'dead';
    }
    
    // Increment days survived if alive
    if (agent.status !== 'dead') {
      agent.daysSurvived++;
    }
    
    return agent;
  });
  
  // Generate events for significant changes
  const events = updatedAgents
    .filter(agent => agent.status === 'dead' && agent.daysSurvived > 0)
    .map(agent => `Day ${day}: ${agent.name} died from starvation or dehydration.`);
  
  // Send result back to main thread
  const response: BatchAgentUpdateResponse = {
    updatedAgents,
    events,
    id
  };
  
  self.postMessage(response);
}

// A* pathfinding algorithm
function findPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  grid: boolean[][]
): { x: number; y: number }[] {
  const openSet: {
    position: { x: number; y: number };
    gScore: number;
    fScore: number;
    parent: { x: number; y: number } | null;
  }[] = [];
  
  const closedSet = new Set<string>();
  const gScores: Record<string, number> = {};
  const fScores: Record<string, number> = {};
  const parents: Record<string, { x: number; y: number } | null> = {};
  
  // Initialize
  const startKey = `${start.x},${start.y}`;
  gScores[startKey] = 0;
  fScores[startKey] = calculateDistance(start, end);
  parents[startKey] = null;
  
  openSet.push({
    position: start,
    gScore: 0,
    fScore: fScores[startKey],
    parent: null
  });
  
  while (openSet.length > 0) {
    // Find node with lowest fScore
    let currentIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].fScore < openSet[currentIndex].fScore) {
        currentIndex = i;
      }
    }
    
    const current = openSet[currentIndex];
    
    // Check if reached end
    if (current.position.x === end.x && current.position.y === end.y) {
      // Reconstruct path
      const path: { x: number; y: number }[] = [];
      let currentPos = current.position;
      
      while (parents[`${currentPos.x},${currentPos.y}`] !== null) {
        path.unshift(currentPos);
        currentPos = parents[`${currentPos.x},${currentPos.y}`]!;
      }
      
      return path;
    }
    
    // Remove current from openSet
    openSet.splice(currentIndex, 1);
    
    // Add current to closedSet
    closedSet.add(`${current.position.x},${current.position.y}`);
    
    // Check neighbors
    const neighbors = getValidNeighbors(current.position, grid);
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      
      // Skip if in closedSet
      if (closedSet.has(neighborKey)) {
        continue;
      }
      
      // Calculate tentative gScore
      const tentativeGScore = gScores[`${current.position.x},${current.position.y}`] + 1;
      
      // Check if neighbor is in openSet
      const neighborInOpenSet = openSet.find(
        node => node.position.x === neighbor.x && node.position.y === neighbor.y
      );
      
      if (!neighborInOpenSet) {
        // Add neighbor to openSet
        gScores[neighborKey] = tentativeGScore;
        fScores[neighborKey] = tentativeGScore + calculateDistance(neighbor, end);
        parents[neighborKey] = current.position;
        
        openSet.push({
          position: neighbor,
          gScore: tentativeGScore,
          fScore: fScores[neighborKey],
          parent: current.position
        });
      } else if (tentativeGScore < gScores[neighborKey]) {
        // Update neighbor
        gScores[neighborKey] = tentativeGScore;
        fScores[neighborKey] = tentativeGScore + calculateDistance(neighbor, end);
        parents[neighborKey] = current.position;
        
        // Update openSet
        neighborInOpenSet.gScore = tentativeGScore;
        neighborInOpenSet.fScore = fScores[neighborKey];
        neighborInOpenSet.parent = current.position;
      }
    }
  }
  
  // No path found
  return [];
}

// Get valid neighboring positions
function getValidNeighbors(
  position: { x: number; y: number },
  grid: boolean[][]
): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = [];
  
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];
  
  for (const dir of directions) {
    const nx = position.x + dir.dx;
    const ny = position.y + dir.dy;
    
    // Check if in bounds
    if (nx >= 0 && ny >= 0 && ny < grid.length && nx < grid[0].length) {
      // Check if passable (not a wall)
      if (!grid[ny][nx]) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  
  return neighbors;
}

// Calculate Manhattan distance between two positions
function calculateDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export {};