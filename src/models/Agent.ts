import type {
  Position,
  AgentStatus,
  AgentStats,
  Birthright,
  Augment,
  Item,
  Achievement,
  Effect,
  IAgent
} from './types';

/**
 * Agent model representing a single character in the simulation
 */
export class Agent implements IAgent {
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

  /**
   * Create a new agent
   * @param id Unique identifier
   * @param name Agent name
   * @param location Starting position
   * @param basinOrigin ID of the basin they started in
   * @param birthright Innate ability
   */
  constructor(
    id: string,
    name: string,
    location: Position,
    basinOrigin: string,
    birthright: Birthright
  ) {
    this.id = id;
    this.name = name;
    this.status = 'alive';
    this.location = location;
    this.basinOrigin = basinOrigin;
    this.stats = {
      health: 100,
      hunger: 100,
      thirst: 100,
      energy: 100,
      morale: 100,
      resourcefulness: 1.0 // Multiplier for resource collection, 1.0 is normal
    };
    this.birthright = birthright;
    this.augment = null;
    this.inventory = [];
    this.knownMap = new Set<string>();
    this.relationships = {};
    this.history = [];
    this.achievements = [];
    this.isNotable = false;
    this.daysSurvived = 0;

    // Add starting location to known map
    this.discoverCell(`${location.x}-${location.y}`);
  }

  /**
   * Move the agent to a new position
   * @param position New position
   */
  moveTo(position: Position): void {
    this.location = position;
    this.discoverCell(`${position.x}-${position.y}`);
    this.stats.energy = Math.max(0, this.stats.energy - 5);
  }

  /**
   * Update agent stats for a new day
   */
  updateDailyStats(): void {
    // Decrease hunger and thirst
    this.stats.hunger = Math.max(0, this.stats.hunger - 10);
    this.stats.thirst = Math.max(0, this.stats.thirst - 15);
    
    // Agents recover energy and health slightly each day, more if resting
    this.stats.energy = Math.min(100, this.stats.energy + 5);
    this.stats.health = Math.min(100, this.stats.health + 2);

    // Health effects from hunger, thirst, and low energy
    if (this.stats.hunger <= 0 || this.stats.thirst <= 0 || this.stats.energy <= 0) {
      this.stats.health = Math.max(0, this.stats.health - 15);
    }
    
    // Update status based on health
    if (this.stats.health <= 0) {
      this.status = 'dead';
    } else if (this.stats.health < 30) {
      this.status = 'injured';
    } else if (this.status === 'injured' && this.stats.health >= 50) { // Changed from > to >=
      this.status = 'alive';
    }
    
    // Increment days survived if still alive
    if (this.status !== 'dead') {
      this.daysSurvived++;
    }
  }

  /**
   * Consume food and water
   * @param food Amount of food to consume
   * @param water Amount of water to consume
   */
  consume(food: number, water: number): void {
    this.stats.hunger = Math.min(100, this.stats.hunger + food);
    this.stats.thirst = Math.min(100, this.stats.thirst + water);
    
    // Improve morale when eating and drinking
    if (food > 0 || water > 0) {
      this.stats.morale = Math.min(100, this.stats.morale + 5);
    }
  }

  /**
   * Add an item to the agent's inventory
   * @param item Item to add
   */
  addItem(item: Item): void {
    const existingItem = this.inventory.find(i => i.id === item.id);
    
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.inventory.push({ ...item });
    }
  }

  /**
   * Use an item from the agent's inventory
   * @param itemId ID of the item to use
   * @returns Whether the item was successfully used
   */
  useItem(itemId: string): boolean {
    const itemIndex = this.inventory.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1 || this.inventory[itemIndex].quantity <= 0) {
      return false;
    }
    
    const item = this.inventory[itemIndex];
    
    // Apply item effects
    for (const effect of item.effects) {
      this.applyEffect(effect);
    }
    
    // Reduce quantity
    item.quantity--;
    
    // Remove item if quantity is 0
    if (item.quantity <= 0) {
      this.inventory.splice(itemIndex, 1);
    }
    
    return true;
  }

  /**
   * Apply an effect to the agent
   * @param effect Effect to apply
   */
  private applyEffect(effect: Effect): void {
    switch (effect.type) {
      case 'health':
        this.stats.health = Math.min(100, this.stats.health + effect.value);
        break;
      case 'hunger':
        this.stats.hunger = Math.min(100, this.stats.hunger + effect.value);
        break;
      case 'thirst':
        this.stats.thirst = Math.min(100, this.stats.thirst + effect.value);
        break;
      case 'energy':
        this.stats.energy = Math.min(100, this.stats.energy + effect.value);
        break;
      case 'morale':
        this.stats.morale = Math.min(100, this.stats.morale + effect.value);
        break;
    }
  }

  /**
   * Add a cell to the agent's known map
   * @param cellId ID of the cell to discover
   */
  discoverCell(cellId: string): void {
    this.knownMap.add(cellId);
  }

  /**
   * Check if a cell is known to the agent
   * @param cellId ID of the cell to check
   * @returns Whether the cell is known
   */
  knowsCell(cellId: string): boolean {
    return this.knownMap.has(cellId);
  }

  /**
   * Update relationship with another agent
   * @param agentId ID of the other agent
   * @param change Amount to change the relationship by
   */
  updateRelationship(agentId: string, change: number): void {
    if (!this.relationships[agentId]) {
      this.relationships[agentId] = 0;
    }
    
    this.relationships[agentId] = Math.max(-100, Math.min(100, this.relationships[agentId] + change));
  }

  /**
   * Add an achievement to the agent
   * @param achievement Achievement to add
   */
  addAchievement(achievement: Achievement): void {
    this.achievements.push(achievement);
    this.history.push(`Day ${achievement.day}: ${achievement.description}`);
    
    // Check if agent should be marked as notable
    this.checkNotability();
  }

  /**
   * Add an event to the agent's history
   * @param day Day the event occurred
   * @param description Description of the event
   */
  addHistoryEvent(day: number, description: string): void {
    this.history.push(`Day ${day}: ${description}`);
  }

  /**
   * Check if the agent should be marked as notable
   */
  private checkNotability(): void {
    // Agents are notable if they have survived a long time
    if (this.daysSurvived > 30) {
      this.isNotable = true;
      return;
    }
    
    // Agents are notable if they have an augment
    if (this.augment !== null) {
      this.isNotable = true;
      return;
    }
    
    // Agents are notable if they have important achievements
    const hasImportantAchievement = this.achievements.some(a => a.importance >= 8);
    if (hasImportantAchievement) {
      this.isNotable = true;
      return;
    }
    
    // Otherwise, not notable
    this.isNotable = false;
  }

  /**
   * Gain an augment from completing a dungeon
   * @param augment Augment to gain
   */
  gainAugment(augment: Augment): void {
    this.augment = augment;
    this.isNotable = true;
  }
}