/**
 * Position in the grid
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Resources that can be found in a cell
 */
export interface Resources {
  food: number;
  water: number;
  health: number; // Health replenishment resource
  energy: number; // Energy replenishment resource
}

/**
 * Cell types in the maze
 */
export type CellType = 'wall' | 'path' | 'basin' | 'dungeon';

/**
 * Cell interface (for models/Cell.ts)
 */
export interface ICell {
  id: string;
  type: CellType;
  position: Position;
  resources: Resources;
  occupants: IAgent[];
  discovered: boolean;
  lastVisitedDay?: number; // Day the cell was last visited
  basinId?: string;
  dungeonId?: string;
}

/**
 * Simplified Cell type for worker processing
 */
export interface SimplifiedCell {
  id: string;
  type: CellType;
  position: Position;
  resources: Resources;
  discovered: boolean;
  lastVisitedDay?: number;
  basinId?: string;
}

/**
 * Simplified Basin type for worker processing
 */
export interface SimplifiedBasin {
  id: string;
  name: string;
  location: Position;
  radius: number;
  resources: Resources;
  cells: SimplifiedCell[]; // Simplified cells within the basin
}

/**
 * Agent status in the simulation
 */
export type AgentStatus = 'alive' | 'injured' | 'dead';

/**
 * Agent statistics
 */
export interface AgentStats {
  health: number;
  hunger: number;
  thirst: number;
  energy: number;
  morale: number;
  resourcefulness: number; // Multiplier for resource collection (e.g., 1.0 is normal)
}

/**
 * Effect of a birthright or augment
 */
export interface Effect {
  type: string;
  value: number;
  description: string;
}

/**
 * Birthright (innate ability)
 */
export interface Birthright {
  id: string;
  name: string;
  description: string;
  effects: Effect[];
}

/**
 * Augment (acquired ability)
 */
export interface Augment {
  id: string;
  name: string;
  description: string;
  effects: Effect[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * Item that can be carried by an agent
 */
export interface Item {
  id: string;
  name: string;
  type: 'food' | 'water' | 'tool' | 'weapon' | 'medicine';
  effects: Effect[];
  quantity: number;
}

/**
 * Achievement earned by an agent
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  day: number;
  importance: number;
}

/**
 * Agent interface to avoid circular dependencies
 */
export interface IAgent {
  id: string;
  name: string;
  status: AgentStatus;
  location: Position;
  basinOrigin: string;
  stats: AgentStats;
  birthright: Birthright;
  augment: Augment | null;
  inventory: Item[];
  knownMap: Set<string>;
  relationships: Record<string, number>;
  history: string[];
  achievements: Achievement[];
  isNotable: boolean;
  daysSurvived: number;
}