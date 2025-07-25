import type { Position, Resources, IAgent } from './types';
import type { Cell } from './Cell';

/**
 * Structure built in a basin
 */
export interface Structure {
  id: string;
  name: string;
  type: string;
  effects: {
    type: string;
    value: number;
    description: string;
  }[];
  buildDay: number;
  condition: number; // 0-100
}

/**
 * Basin model representing a starting area in the maze
 */
export class Basin {
  id: string;
  name: string;
  location: Position;
  radius: number;
  population: IAgent[];
  resources: Resources;
  structures: Structure[];
  history: string[];
  cells: Cell[];

  /**
   * Create a new basin
   * @param id Unique identifier
   * @param name Basin name
   * @param location Center position
   * @param radius Size of the basin area
   */
  constructor(id: string, name: string, location: Position, radius: number) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.radius = radius;
    this.population = [];
    this.resources = { food: 0, water: 0, health: 0, energy: 0 };
    this.structures = [];
    this.history = [];
    this.cells = [];
  }

  /**
   * Add an agent to the basin population
   * @param agent Agent to add
   */
  addAgent(agent: IAgent): void {
    if (!this.population.includes(agent)) {
      this.population.push(agent);
    }
  }

  /**
   * Remove an agent from the basin population
   * @param agent Agent to remove
   */
  removeAgent(agent: IAgent): void {
    this.population = this.population.filter(a => a.id !== agent.id);
  }

  /**
   * Add a cell to the basin
   * @param cell Cell to add
   */
  addCell(cell: Cell): void {
    if (!this.cells.includes(cell)) {
      this.cells.push(cell);
      cell.convertToBasin(this.id);
    }
  }

  /**
   * Add resources to the basin
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
   * Consume resources from the basin
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
    
    return { food: consumedFood, water: consumedWater, health: consumedHealth, energy: consumedEnergy };
  }

  /**
   * Add a structure to the basin
   * @param structure Structure to add
   */
  addStructure(structure: Structure): void {
    this.structures.push(structure);
  }

  /**
   * Add an event to the basin's history
   * @param day Day the event occurred
   * @param description Description of the event
   */
  addHistoryEvent(day: number, description: string): void {
    this.history.push(`Day ${day}: ${description}`);
  }

  /**
   * Get the total population count
   * @returns Number of agents in the basin
   */
  getPopulationCount(): number {
    return this.population.length;
  }

  /**
   * Get the living population count
   * @returns Number of living agents in the basin
   */
  getLivingPopulationCount(): number {
    return this.population.filter(agent => agent.status !== 'dead').length;
  }

  /**
   * Check if a position is within the basin
   * @param position Position to check
   * @returns Whether the position is within the basin
   */
  isPositionInBasin(position: Position): boolean {
    const dx = position.x - this.location.x;
    const dy = position.y - this.location.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= this.radius * this.radius;
  }

  /**
   * Distribute resources to cells within the basin
   */
  distributeResources(): void {
    // Calculate total resources to distribute
    const totalFood = 50 + Math.floor(Math.random() * 50); // 50-99
    const totalWater = 70 + Math.floor(Math.random() * 30); // 70-99
    const totalHealth = 30 + Math.floor(Math.random() * 20); // 30-49
    const totalEnergy = 40 + Math.floor(Math.random() * 20); // 40-59
    
    // Calculate per-cell resources
    const foodPerCell = Math.floor(totalFood / this.cells.length);
    const waterPerCell = Math.floor(totalWater / this.cells.length);
    const healthPerCell = Math.floor(totalHealth / this.cells.length);
    const energyPerCell = Math.floor(totalEnergy / this.cells.length);
    
    // Distribute to cells
    for (const cell of this.cells) {
      cell.addResources(foodPerCell, waterPerCell, healthPerCell, energyPerCell);
    }
    
    // Add remaining resources to basin storage
    this.resources.food += totalFood - (foodPerCell * this.cells.length);
    this.resources.water += totalWater - (waterPerCell * this.cells.length);
    this.resources.health += totalHealth - (healthPerCell * this.cells.length);
    this.resources.energy += totalEnergy - (energyPerCell * this.cells.length);
  }
}