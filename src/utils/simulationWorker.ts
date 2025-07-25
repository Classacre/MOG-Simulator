import type { Position, AgentStatus, AgentStats, SimplifiedCell, SimplifiedBasin } from '../models/types';

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
  status: AgentStatus;
  stats: AgentStats;
  location: Position;
  daysSurvived: number;
  knownMap: Set<string>; // Added knownMap for cell discovery
}

interface BatchAgentUpdateRequest {
  agents: SimplifiedAgent[]; // Simplified agent data
  cells: SimplifiedCell[][]; // Full grid of simplified cells
  basins: SimplifiedBasin[]; // Simplified basins
  day: number;
}

interface BatchAgentUpdateResponse {
  updatedAgents: SimplifiedAgent[];
  updatedCells: SimplifiedCell[][]; // Return updated cells
  updatedBasins: SimplifiedBasin[]; // Return updated basins
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
  const { agents, cells, basins, day } = request;

  // Deep clone cells and basins to avoid direct modification of the original objects
  // This is important because the worker receives a copy of the data, and we want to return
  // modified copies, not mutate the original received objects.
  const updatedCells: SimplifiedCell[][] = JSON.parse(JSON.stringify(cells));
  const updatedBasins: SimplifiedBasin[] = JSON.parse(JSON.stringify(basins));

  const events: string[] = [];

  // --- Basin Replenishment Logic ---
  updatedBasins.forEach(basin => {
    // Basins replenish resources daily
    basin.resources.food = Math.min(1000, basin.resources.food + 10); // Example: Add 10 food daily, max 1000
    basin.resources.water = Math.min(1000, basin.resources.water + 15); // Example: Add 15 water daily, max 1000
    basin.resources.health = Math.min(1000, basin.resources.health + 5); // Example: Add 5 health daily, max 1000
    basin.resources.energy = Math.min(1000, basin.resources.energy + 8); // Example: Add 8 energy daily, max 1000
  });

  // --- Agent Update Logic ---
  const updatedAgents = agents.map(agent => {
    if (agent.status === 'dead') return agent;

    // Get current cell of the agent
    const currentCell = updatedCells[agent.location.y]?.[agent.location.x];

    if (currentCell) {
      // Mark cell as discovered by the agent
      agent.knownMap.add(currentCell.id);
      
      // Update cell's last visited day
      currentCell.lastVisitedDay = day;

      // --- Cell Resource Diminution ---
      // If the cell is not a basin and has not been visited today, diminish its resources
      if (currentCell.type !== 'basin' && currentCell.lastVisitedDay !== day) {
        currentCell.resources.food = Math.max(0, currentCell.resources.food - 5);
        currentCell.resources.water = Math.max(0, currentCell.resources.water - 5);
        currentCell.resources.health = Math.max(0, currentCell.resources.health - 2);
        currentCell.resources.energy = Math.max(0, currentCell.resources.energy - 2);
      }

      // --- Agent Interaction with Cell Resources (Replenishment from Basins) ---
      if (currentCell.type === 'basin') {
        const basin = updatedBasins.find(b => b.id === currentCell.basinId);
        if (basin) {
          // Agent consumes resources from the basin
          const consumedFood = Math.min(basin.resources.food, 20);
          const consumedWater = Math.min(basin.resources.water, 20);
          const consumedHealth = Math.min(basin.resources.health, 10);
          const consumedEnergy = Math.min(basin.resources.energy, 15);

          basin.resources.food -= consumedFood;
          basin.resources.water -= consumedWater;
          basin.resources.health -= consumedHealth;
          basin.resources.energy -= consumedEnergy;

          agent.stats.hunger = Math.min(100, agent.stats.hunger + consumedFood);
          agent.stats.thirst = Math.min(100, agent.stats.thirst + consumedWater);
          agent.stats.health = Math.min(100, agent.stats.health + consumedHealth);
          agent.stats.energy = Math.min(100, agent.stats.energy + consumedEnergy);
        }
      } else {
        // Agent consumes resources from non-basin cells
        const consumedFood = Math.min(currentCell.resources.food, 5);
        const consumedWater = Math.min(currentCell.resources.water, 5);
        const consumedHealth = Math.min(currentCell.resources.health, 1);
        const consumedEnergy = Math.min(currentCell.resources.energy, 2);

        currentCell.resources.food -= consumedFood;
        currentCell.resources.water -= consumedWater;
        currentCell.resources.health -= consumedHealth;
        currentCell.resources.energy -= consumedEnergy;

        agent.stats.hunger = Math.min(100, agent.stats.hunger + consumedFood);
        agent.stats.thirst = Math.min(100, agent.stats.thirst + consumedWater);
        agent.stats.health = Math.min(100, agent.stats.health + consumedHealth);
        agent.stats.energy = Math.min(100, agent.stats.energy + consumedEnergy);
      }
    }

    // Daily stat updates (hunger, thirst decrease, health, energy recovery)
    agent.stats.hunger = Math.max(0, agent.stats.hunger - 10);
    agent.stats.thirst = Math.max(0, agent.stats.thirst - 15);
    agent.stats.energy = Math.min(100, agent.stats.energy + 5); // Slight energy recovery
    agent.stats.health = Math.min(100, agent.stats.health + 2); // Slight health recovery

    // Health effects from hunger, thirst, and low energy
    if (agent.stats.hunger <= 0 || agent.stats.thirst <= 0) {
      agent.stats.health = Math.max(0, agent.stats.health - 15);
      events.push(`Day ${day}: ${agent.name} is suffering from hunger/thirst.`);
    }
    if (agent.stats.energy <= 0) {
      agent.stats.health = Math.max(0, agent.stats.health - 10);
      events.push(`Day ${day}: ${agent.name} is exhausted.`);
    }

    // Update status based on health
    if (agent.stats.health <= 0) {
      agent.status = 'dead';
      events.push(`Day ${day}: ${agent.name} died.`);
    } else if (agent.stats.health < 30) {
      agent.status = 'injured';
    } else if (agent.status === 'injured' && agent.stats.health >= 50) {
      agent.status = 'alive';
    }

    // Increment days survived if alive
    if (agent.status !== 'dead') {
      agent.daysSurvived++;
    }

    return agent;
  });
  
  // Send result back to main thread
  const response: BatchAgentUpdateResponse = {
    updatedAgents,
    updatedCells,
    updatedBasins,
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