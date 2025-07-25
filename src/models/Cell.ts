import type { CellType, Position, Resources, IAgent, ICell } from './types';

/**
 * Cell model representing a single cell in the maze grid
 */
export class Cell implements ICell {
  id: string;
  type: CellType;
  position: Position;
  resources: Resources;
  occupants: IAgent[];
  discovered: boolean;
  lastVisitedDay?: number;
  basinId?: string;
  dungeonId?: string;

  /**
   * Create a new cell
   * @param x X coordinate
   * @param y Y coordinate
   * @param type Cell type
   */
  constructor(x: number, y: number, type: CellType = 'wall') {
    this.id = `${x}-${y}`;
    this.position = { x, y };
    this.type = type;
    this.resources = { food: 0, water: 0, health: 0, energy: 0 };
    this.occupants = [];
    this.discovered = false;
    this.lastVisitedDay = undefined;
  }

  /**
   * Check if the cell is passable (can be moved through)
   */
  isPassable(): boolean {
    return this.type !== 'wall';
  }

  /**
   * Add resources to the cell
   * @param food Amount of food to add
   * @param water Amount of water to add
   * @param health Amount of health to add
   * @param energy Amount of energy to add
   */
  addResources(food: number, water: number, health: number = 0, energy: number = 0): void {
    this.resources.food += food;
    this.resources.water += water;
    this.resources.health += health;
    this.resources.energy += energy;
  }

  /**
   * Consume resources from the cell
   * @param food Amount of food to consume
   * @param water Amount of water to consume
   * @param health Amount of health to consume
   * @param energy Amount of energy to consume
   * @returns Actually consumed resources (may be less than requested if not enough available)
   */
  consumeResources(food: number, water: number, health: number = 0, energy: number = 0): Resources {
    const consumedFood = Math.min(this.resources.food, food);
    const consumedWater = Math.min(this.resources.water, water);
    const consumedHealth = Math.min(this.resources.health, health);
    const consumedEnergy = Math.min(this.resources.energy, energy);
    
    this.resources.food -= consumedFood;
    this.resources.water -= consumedWater;
    this.resources.health -= consumedHealth;
    this.resources.energy -= consumedEnergy;
    
    return {
      food: consumedFood,
      water: consumedWater,
      health: consumedHealth,
      energy: consumedEnergy
    };
  }

  /**
   * Add an agent to this cell
   * @param agent Agent to add
   */
  addAgent(agent: IAgent): void {
    if (!this.occupants.includes(agent)) {
      this.occupants.push(agent);
    }
  }

  /**
   * Remove an agent from this cell
   * @param agent Agent to remove
   */
  removeAgent(agent: IAgent): void {
    this.occupants = this.occupants.filter(a => a.id !== agent.id);
  }

  /**
   * Mark the cell as discovered
   */
  markDiscovered(): void {
    this.discovered = true;
  }

  /**
   * Convert the cell to a basin
   * @param basinId ID of the basin
   */
  convertToBasin(basinId: string): void {
    this.type = 'basin';
    this.basinId = basinId;
  }

  /**
   * Convert the cell to a dungeon
   * @param dungeonId ID of the dungeon
   */
  convertToDungeon(dungeonId: string): void {
    this.type = 'dungeon';
    this.dungeonId = dungeonId;
  }

  /**
   * Convert the cell to a path
   */
  convertToPath(): void {
    this.type = 'path';
    this.basinId = undefined;
    this.dungeonId = undefined;
  }
}