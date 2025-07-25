import { Agent } from '../models/Agent';
import { Cell } from '../models/Cell';
import { Basin } from '../models/Basin';
import { Dungeon } from '../models/Dungeon';
import type { Position } from '../models/types';

/**
 * Agent action types
 */
export type AgentActionType = 
  | 'move'
  | 'rest'
  | 'eat'
  | 'drink'
  | 'explore'
  | 'challenge_dungeon'
  | 'socialize'
  | 'help'
  | 'flee';

/**
 * Agent action result
 */
export interface AgentActionResult {
  success: boolean;
  message: string;
  effects: {
    type: string;
    value: number;
  }[];
}

/**
 * Agent action
 */
export interface AgentAction {
  type: AgentActionType;
  targetPosition?: Position;
  targetAgentId?: string;
  targetCellId?: string;
  targetDungeonId?: string;
  execute: () => AgentActionResult;
}

/**
 * Decision context for agent decision making
 */
export interface DecisionContext {
  agent: Agent;
  grid: Cell[][];
  agents: Agent[];
  basins: Basin[];
  dungeons: Dungeon[];
  day: number;
}

/**
 * Decide action for an agent
 * @param context Decision context
 * @returns Agent action
 */
export function decideAction(context: DecisionContext): AgentAction {
  const { agent } = context;
  
  // Dead agents don't take actions
  if (agent.status === 'dead') {
    return {
      type: 'rest',
      execute: () => ({
        success: true,
        message: `${agent.name} is dead and cannot take actions.`,
        effects: []
      })
    };
  }
  
  // Priority 1: Survival - If hungry or thirsty, find resources
  if (agent.stats.hunger < 30 || agent.stats.thirst < 30) {
    return findResourceAction(context);
  }
  
  // Priority 2: Safety - If injured or in danger, seek safety
  if (agent.stats.health < 50 || isInDanger(context)) {
    return findSafetyAction(context);
  }
  
  // Priority 3: Advancement - If basic needs are met, explore or challenge dungeons
  if (agent.stats.hunger > 70 && agent.stats.thirst > 70 && agent.stats.health > 80) {
    // Chance to attempt dungeon based on personality and stats
    if (shouldAttemptDungeon(context)) {
      return createDungeonAction(context);
    }
    
    // Otherwise explore
    return createExplorationAction(context);
  }
  
  // Default: Rest and recover
  return createRestAction(context);
}

/**
 * Check if an agent is in danger
 * @param context Decision context
 * @returns Whether the agent is in danger
 */
function isInDanger(context: DecisionContext): boolean {
  const { agent, grid } = context;
  
  // Check if agent is in a dangerous cell
  const cell = getCellAtPosition(grid, agent.location);
  if (!cell || cell.type === 'wall') {
    return true; // Agent is in an invalid or wall cell
  }
  
  // Check if agent is severely injured
  if (agent.stats.health < 20) {
    return true;
  }
  
  // Check if agent is severely hungry or thirsty
  if (agent.stats.hunger < 10 || agent.stats.thirst < 10) {
    return true;
  }
  
  return false;
}

/**
 * Find a resource action for an agent
 * @param context Decision context
 * @returns Agent action
 */
function findResourceAction(context: DecisionContext): AgentAction {
  const { agent, grid } = context;
  
  // Check if current cell has resources
  const currentCell = getCellAtPosition(grid, agent.location);
  if (currentCell && (currentCell.resources.food > 0 || currentCell.resources.water > 0)) {
    // Consume resources from current cell
    if (agent.stats.hunger < agent.stats.thirst && currentCell.resources.food > 0) {
      return {
        type: 'eat',
        targetCellId: currentCell.id,
        execute: () => {
          const consumed = currentCell.consumeResources(10, 0);
          agent.consume(consumed.food, consumed.water);
          return {
            success: true,
            message: `${agent.name} consumed food from the current location.`,
            effects: [
              { type: 'hunger', value: consumed.food }
            ]
          };
        }
      };
    } else if (currentCell.resources.water > 0) {
      return {
        type: 'drink',
        targetCellId: currentCell.id,
        execute: () => {
          const consumed = currentCell.consumeResources(0, 15);
          agent.consume(consumed.food, consumed.water);
          return {
            success: true,
            message: `${agent.name} consumed water from the current location.`,
            effects: [
              { type: 'thirst', value: consumed.water }
            ]
          };
        }
      };
    }
  }
  
  // Find cell with resources
  const resourceCell = findNearestResourceCell(context);
  if (resourceCell) {
    // Move towards resource cell
    const path = findPath(agent.location, resourceCell.position, grid);
    if (path.length > 0) {
      const nextPosition = path[0];
      return {
        type: 'move',
        targetPosition: nextPosition,
        execute: () => {
          agent.moveTo(nextPosition);
          return {
            success: true,
            message: `${agent.name} moved towards resources.`,
            effects: [
              { type: 'energy', value: -5 }
            ]
          };
        }
      };
    }
  }
  
  // If no resource cell found, move randomly
  return createRandomMoveAction(context);
}

/**
 * Find a safety action for an agent
 * @param context Decision context
 * @returns Agent action
 */
function findSafetyAction(context: DecisionContext): AgentAction {
  const { agent, grid, basins } = context;
  
  // Find nearest basin (safe area)
  let nearestBasin: Basin | null = null;
  let minDistance = Infinity;
  
  for (const basin of basins) {
    const distance = calculateDistance(agent.location, basin.location);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBasin = basin;
    }
  }
  
  if (nearestBasin) {
    // Check if already in basin
    const currentCell = getCellAtPosition(grid, agent.location);
    if (currentCell && currentCell.type === 'basin' && currentCell.basinId === nearestBasin.id) {
      // Already in basin, rest
      return createRestAction(context);
    }
    
    // Move towards basin
    const path = findPath(agent.location, nearestBasin.location, grid);
    if (path.length > 0) {
      const nextPosition = path[0];
      return {
        type: 'move',
        targetPosition: nextPosition,
        execute: () => {
          agent.moveTo(nextPosition);
          return {
            success: true,
            message: `${agent.name} moved towards safety.`,
            effects: [
              { type: 'energy', value: -5 }
            ]
          };
        }
      };
    }
  }
  
  // If no basin found or can't path to it, rest
  return createRestAction(context);
}

/**
 * Check if an agent should attempt a dungeon
 * @param context Decision context
 * @returns Whether the agent should attempt a dungeon
 */
function shouldAttemptDungeon(context: DecisionContext): boolean {
  const { agent, dungeons } = context;
  
  // Only attempt dungeon if agent doesn't already have an augment
  if (agent.augment !== null) {
    return false;
  }
  
  // Check if there are any dungeons
  if (dungeons.length === 0) {
    return false;
  }
  
  // Base chance is 1%
  let chance = 1;
  
  // Increase chance based on days survived
  chance += agent.daysSurvived * 0.1;
  
  // Increase chance based on health
  chance += (agent.stats.health - 80) * 0.1;
  
  // Increase chance based on morale
  chance += (agent.stats.morale - 50) * 0.05;
  
  // Cap chance at 10%
  chance = Math.min(10, chance);
  
  // Roll the dice
  return Math.random() * 100 < chance;
}

/**
 * Create a dungeon action for an agent
 * @param context Decision context
 * @returns Agent action
 */
function createDungeonAction(context: DecisionContext): AgentAction {
  const { agent, grid, dungeons } = context;
  
  // Find nearest dungeon
  let nearestDungeon: Dungeon | null = null;
  let minDistance = Infinity;
  
  for (const dungeon of dungeons) {
    const distance = calculateDistance(agent.location, dungeon.location);
    if (distance < minDistance) {
      minDistance = distance;
      nearestDungeon = dungeon;
    }
  }
  
  if (nearestDungeon) {
    // Check if already at dungeon
    const currentCell = getCellAtPosition(grid, agent.location);
    if (currentCell && currentCell.type === 'dungeon' && currentCell.dungeonId === nearestDungeon.id) {
      // At dungeon, attempt challenge
      return {
        type: 'challenge_dungeon',
        targetDungeonId: nearestDungeon.id,
        execute: () => {
          // Calculate success chance
          const agentLevel = calculateAgentLevel(agent);
          const successChance = nearestDungeon.calculateSuccessChance(agentLevel);
          
          // Roll the dice
          const success = Math.random() * 100 < successChance;
          
          if (success) {
            // Success! Agent gains augment
            const augment = nearestDungeon.getAugmentReward();
            agent.gainAugment(augment);
            
            // Record attempt
            nearestDungeon.recordAttempt(agent.daysSurvived, agent.id, agent.name, true);
            
            return {
              success: true,
              message: `${agent.name} conquered the ${nearestDungeon.name} and gained the ${augment.name} augment!`,
              effects: [
                { type: 'augment', value: 1 }
              ]
            };
          } else {
            // Failure! Agent dies
            agent.status = 'dead';
            
            // Record attempt
            nearestDungeon.recordAttempt(agent.daysSurvived, agent.id, agent.name, false);
            
            return {
              success: false,
              message: `${agent.name} attempted to challenge the ${nearestDungeon.name} but was defeated.`,
              effects: [
                { type: 'health', value: -100 }
              ]
            };
          }
        }
      };
    }
    
    // Move towards dungeon
    const path = findPath(agent.location, nearestDungeon.location, grid);
    if (path.length > 0) {
      const nextPosition = path[0];
      return {
        type: 'move',
        targetPosition: nextPosition,
        execute: () => {
          agent.moveTo(nextPosition);
          return {
            success: true,
            message: `${agent.name} moved towards the ${nearestDungeon.name}.`,
            effects: [
              { type: 'energy', value: -5 }
            ]
          };
        }
      };
    }
  }
  
  // If no dungeon found or can't path to it, explore
  return createExplorationAction(context);
}

/**
 * Create an exploration action for an agent
 * @param context Decision context
 * @returns Agent action
 */
function createExplorationAction(context: DecisionContext): AgentAction {
  const { agent, grid } = context;
  
  // Find unexplored cells
  const unexploredCells: Cell[] = [];
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const cell = grid[y][x];
      if (cell.type !== 'wall' && !agent.knowsCell(cell.id)) {
        unexploredCells.push(cell);
      }
    }
  }
  
  // If there are unexplored cells, move towards the nearest one
  if (unexploredCells.length > 0) {
    // Find nearest unexplored cell
    let nearestCell: Cell | null = null;
    let minDistance = Infinity;
    
    for (const cell of unexploredCells) {
      const distance = calculateDistance(agent.location, cell.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCell = cell;
      }
    }
    
    if (nearestCell) {
      // Move towards unexplored cell
      const path = findPath(agent.location, nearestCell.position, grid);
      if (path.length > 0) {
        const nextPosition = path[0];
        return {
          type: 'move',
          targetPosition: nextPosition,
          execute: () => {
            agent.moveTo(nextPosition);
            return {
              success: true,
              message: `${agent.name} explored new territory.`,
              effects: [
                { type: 'energy', value: -5 }
              ]
            };
          }
        };
      }
    }
  }
  
  // If no unexplored cells or can't path to them, move randomly
  return createRandomMoveAction(context);
}

/**
 * Create a rest action for an agent
 * @param context Decision context
 * @returns Agent action
 */
function createRestAction(context: DecisionContext): AgentAction {
  const { agent } = context;
  
  return {
    type: 'rest',
    execute: () => {
      // Recover energy
      agent.stats.energy = Math.min(100, agent.stats.energy + 20);
      
      // Recover health if not injured
      if (agent.status !== 'injured') {
        agent.stats.health = Math.min(100, agent.stats.health + 5);
      }
      
      return {
        success: true,
        message: `${agent.name} rested and recovered energy.`,
        effects: [
          { type: 'energy', value: 20 },
          { type: 'health', value: 5 }
        ]
      };
    }
  };
}

/**
 * Create a random move action for an agent
 * @param context Decision context
 * @returns Agent action
 */
function createRandomMoveAction(context: DecisionContext): AgentAction {
  const { agent, grid } = context;
  
  // Get valid neighboring cells
  const neighbors = getValidNeighbors(agent.location, grid);
  
  // If no valid neighbors, rest
  if (neighbors.length === 0) {
    return createRestAction(context);
  }
  
  // Pick a random neighbor
  const randomIndex = Math.floor(Math.random() * neighbors.length);
  const nextPosition = neighbors[randomIndex];
  
  return {
    type: 'move',
    targetPosition: nextPosition,
    execute: () => {
      agent.moveTo(nextPosition);
      return {
        success: true,
        message: `${agent.name} moved randomly.`,
        effects: [
          { type: 'energy', value: -5 }
        ]
      };
    }
  };
}

/**
 * Find the nearest cell with resources
 * @param context Decision context
 * @returns Nearest cell with resources or null if none found
 */
function findNearestResourceCell(context: DecisionContext): Cell | null {
  const { agent, grid } = context;
  
  // Find cells with resources
  const resourceCells: Cell[] = [];
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const cell = grid[y][x];
      if (cell.type !== 'wall' && (cell.resources.food > 0 || cell.resources.water > 0)) {
        resourceCells.push(cell);
      }
    }
  }
  
  // If no resource cells, return null
  if (resourceCells.length === 0) {
    return null;
  }
  
  // Find nearest resource cell
  let nearestCell: Cell | null = null;
  let minDistance = Infinity;
  
  for (const cell of resourceCells) {
    const distance = calculateDistance(agent.location, cell.position);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCell = cell;
    }
  }
  
  return nearestCell;
}

/**
 * Get valid neighboring positions
 * @param position Current position
 * @param grid Maze grid
 * @returns Array of valid neighboring positions
 */
function getValidNeighbors(position: Position, grid: Cell[][]): Position[] {
  const neighbors: Position[] = [];
  
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
      // Check if passable
      if (grid[ny][nx].type !== 'wall') {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  
  return neighbors;
}

/**
 * Get cell at position
 * @param grid Maze grid
 * @param position Position
 * @returns Cell at position or null if out of bounds
 */
function getCellAtPosition(grid: Cell[][], position: Position): Cell | null {
  const { x, y } = position;
  
  // Check if in bounds
  if (x >= 0 && y >= 0 && y < grid.length && x < grid[0].length) {
    return grid[y][x];
  }
  
  return null;
}

/**
 * Calculate Manhattan distance between two positions
 * @param a First position
 * @param b Second position
 * @returns Manhattan distance
 */
function calculateDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Calculate agent level based on stats and traits
 * @param agent Agent
 * @returns Agent level
 */
function calculateAgentLevel(agent: Agent): number {
  let level = 1;
  
  // Add level based on days survived
  level += Math.floor(agent.daysSurvived / 10);
  
  // Add level based on stats
  level += Math.floor(agent.stats.health / 20);
  level += Math.floor(agent.stats.morale / 20);
  
  // Add level based on birthright
  for (const effect of agent.birthright.effects) {
    if (effect.type === 'combat' || effect.type === 'defense') {
      level += Math.floor(effect.value / 10);
    }
  }
  
  return level;
}

/**
 * Find a path between two positions using A* algorithm
 * @param start Starting position
 * @param end Ending position
 * @param grid Maze grid
 * @returns Array of positions representing the path (excluding start)
 */
function findPath(start: Position, end: Position, grid: Cell[][]): Position[] {
  // A* algorithm
  const openSet: {
    position: Position;
    gScore: number;
    fScore: number;
    parent: Position | null;
  }[] = [];
  
  const closedSet = new Set<string>();
  const gScores: Record<string, number> = {};
  const fScores: Record<string, number> = {};
  const parents: Record<string, Position | null> = {};
  
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
      const path: Position[] = [];
      let currentPos = current.position;
      
      while (parents[`${currentPos.x},${currentPos.y}`] !== null) {
        path.unshift(currentPos);
        currentPos = parents[`${currentPos.x},${currentPos.y}`]!;
      }
      
      // Remove start position from path
      if (path.length > 0 && path[0].x === start.x && path[0].y === start.y) {
        path.shift();
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

/**
 * Update all agents for a new day
 * @param agents Array of agents
 * @param grid Maze grid
 * @param basins Array of basins
 * @param dungeons Array of dungeons
 * @param day Current day
 * @returns Array of event messages
 */
export function updateAgents(
  agents: Agent[],
  grid: Cell[][],
  basins: Basin[],
  dungeons: Dungeon[],
  day: number
): string[] {
  const events: string[] = [];
  
  // Update each agent
  for (const agent of agents) {
    // Skip dead agents
    if (agent.status === 'dead') {
      continue;
    }
    
    // Update daily stats
    agent.updateDailyStats();
    
    // Check if agent died from hunger or thirst
    // @ts-expect-error: Agent status can legitimately become 'dead' after updateDailyStats()
    if (agent.status === 'dead') {
      events.push(`Day ${day}: ${agent.name} died from starvation or dehydration.`);
      continue;
    }
    
    // Decide and execute action
    const context: DecisionContext = {
      agent,
      grid,
      agents,
      basins,
      dungeons,
      day
    };
    
    const action = decideAction(context);
    const result = action.execute();
    
    // Add event if significant
    if (action.type !== 'rest' || !result.success) {
      events.push(`Day ${day}: ${result.message}`);
    }
  }
  
  return events;
}

/**
 * Agent status types
 */
export type AgentStatus = 'alive' | 'injured' | 'dead';