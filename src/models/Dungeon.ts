import type { Position, Augment } from './types';
import type { Cell } from './Cell';

/**
 * Event related to a dungeon
 */
export interface DungeonEvent {
  id: string;
  day: number;
  agentId: string;
  agentName: string;
  success: boolean;
  description: string;
}

/**
 * Dungeon model representing a special challenge location in the maze
 */
export class Dungeon {
  id: string;
  name: string;
  location: Position;
  difficulty: number; // 1-10, affects success chance
  augmentReward: Augment;
  challengesCompleted: number;
  history: DungeonEvent[];
  cell: Cell | null;

  /**
   * Create a new dungeon
   * @param id Unique identifier
   * @param name Dungeon name
   * @param location Position
   * @param difficulty Difficulty level (1-10)
   * @param augmentReward Augment granted upon completion
   */
  constructor(
    id: string,
    name: string,
    location: Position,
    difficulty: number,
    augmentReward: Augment
  ) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.difficulty = Math.max(1, Math.min(10, difficulty)); // Clamp between 1-10
    this.augmentReward = augmentReward;
    this.challengesCompleted = 0;
    this.history = [];
    this.cell = null;
  }

  /**
   * Set the cell for this dungeon
   * @param cell Cell to set
   */
  setCell(cell: Cell): void {
    this.cell = cell;
    cell.convertToDungeon(this.id);
  }

  /**
   * Calculate success chance for an agent attempting the dungeon
   * @param agentLevel Agent's effective level (based on stats, birthright, etc.)
   * @returns Success chance as a percentage (0-100)
   */
  calculateSuccessChance(agentLevel: number): number {
    // Base chance is very low (5-10%)
    const baseChance = 5 + (agentLevel / 2);
    
    // Difficulty reduces chance
    const difficultyFactor = 1 - (this.difficulty / 20); // 0.5 to 0.95
    
    // Calculate final chance
    const chance = baseChance * difficultyFactor;
    
    // Clamp between 1% and 30%
    return Math.max(1, Math.min(30, chance));
  }

  /**
   * Record a challenge attempt
   * @param day Day of the attempt
   * @param agentId ID of the agent
   * @param agentName Name of the agent
   * @param success Whether the attempt was successful
   * @returns Event ID
   */
  recordAttempt(day: number, agentId: string, agentName: string, success: boolean): string {
    const eventId = `dungeon-event-${this.id}-${day}-${agentId}`;
    
    let description = '';
    if (success) {
      description = `${agentName} conquered the ${this.name} and gained the ${this.augmentReward.name} augment!`;
      this.challengesCompleted++;
    } else {
      description = `${agentName} attempted to challenge the ${this.name} but was defeated.`;
    }
    
    const event: DungeonEvent = {
      id: eventId,
      day,
      agentId,
      agentName,
      success,
      description
    };
    
    this.history.push(event);
    return eventId;
  }

  /**
   * Get the augment reward for completing the dungeon
   * @returns The augment reward
   */
  getAugmentReward(): Augment {
    return { ...this.augmentReward };
  }

  /**
   * Get the success rate of the dungeon
   * @returns Percentage of successful attempts (0-100)
   */
  getSuccessRate(): number {
    if (this.history.length === 0) {
      return 0;
    }
    
    const successfulAttempts = this.history.filter(event => event.success).length;
    return (successfulAttempts / this.history.length) * 100;
  }

  /**
   * Get the total number of attempts
   * @returns Number of attempts
   */
  getTotalAttempts(): number {
    return this.history.length;
  }

  /**
   * Get the number of successful attempts
   * @returns Number of successful attempts
   */
  getSuccessfulAttempts(): number {
    return this.history.filter(event => event.success).length;
  }

  /**
   * Get the number of failed attempts
   * @returns Number of failed attempts
   */
  getFailedAttempts(): number {
    return this.history.filter(event => !event.success).length;
  }
}