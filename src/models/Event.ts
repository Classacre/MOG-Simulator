import type { Position } from './types';

/**
 * Outcome of an event
 */
export interface Outcome {
  type: string;
  targetId: string;
  targetType: 'agent' | 'basin' | 'dungeon' | 'cell';
  value: number;
  description: string;
}

/**
 * Event categories
 */
export type EventCategory =
  | 'survival'
  | 'exploration'
  | 'social'
  | 'dungeon'
  | 'random'
  | 'resource'
  | 'combat'
  | 'achievement';

/**
 * Event model representing something that happened in the simulation
 */
export class Event {
  id: string;
  day: number;
  category: EventCategory;
  description: string;
  agentIds: string[];
  location: Position;
  basinId?: string;
  dungeonId?: string;
  outcomes: Outcome[];
  importance: number; // 1-10, used for filtering and highlighting

  /**
   * Create a new event
   * @param id Unique identifier
   * @param day Day the event occurred
   * @param category Category of the event
   * @param description Human-readable description
   * @param agentIds IDs of agents involved
   * @param location Position where the event occurred
   * @param importance Importance level (1-10)
   */
  constructor(
    id: string,
    day: number,
    category: EventCategory,
    description: string,
    agentIds: string[],
    location: Position,
    importance: number
  ) {
    this.id = id;
    this.day = day;
    this.category = category;
    this.description = description;
    this.agentIds = agentIds;
    this.location = location;
    this.outcomes = [];
    this.importance = Math.max(1, Math.min(10, importance)); // Clamp between 1-10
  }

  /**
   * Set the basin ID for this event
   * @param basinId ID of the basin
   */
  setBasinId(basinId: string): void {
    this.basinId = basinId;
  }

  /**
   * Set the dungeon ID for this event
   * @param dungeonId ID of the dungeon
   */
  setDungeonId(dungeonId: string): void {
    this.dungeonId = dungeonId;
  }

  /**
   * Add an outcome to this event
   * @param outcome Outcome to add
   */
  addOutcome(outcome: Outcome): void {
    this.outcomes.push(outcome);
  }

  /**
   * Add multiple outcomes to this event
   * @param outcomes Outcomes to add
   */
  addOutcomes(outcomes: Outcome[]): void {
    this.outcomes.push(...outcomes);
  }

  /**
   * Get a formatted string representation of the event
   * @returns Formatted event string
   */
  getFormattedString(): string {
    return `Day ${this.day}: ${this.description}`;
  }

  /**
   * Check if an agent is involved in this event
   * @param agentId ID of the agent
   * @returns Whether the agent is involved
   */
  involvesAgent(agentId: string): boolean {
    return this.agentIds.includes(agentId);
  }

  /**
   * Check if a basin is involved in this event
   * @param basinId ID of the basin
   * @returns Whether the basin is involved
   */
  involvesBasin(basinId: string): boolean {
    return this.basinId === basinId;
  }

  /**
   * Check if a dungeon is involved in this event
   * @param dungeonId ID of the dungeon
   * @returns Whether the dungeon is involved
   */
  involvesDungeon(dungeonId: string): boolean {
    return this.dungeonId === dungeonId;
  }

  /**
   * Check if the event is important
   * @param threshold Importance threshold (default: 7)
   * @returns Whether the event is important
   */
  isImportant(threshold: number = 7): boolean {
    return this.importance >= threshold;
  }

  /**
   * Create a survival event
   * @param id Event ID
   * @param day Day of the event
   * @param description Event description
   * @param agentIds Agent IDs involved
   * @param location Event location
   * @param outcomes Event outcomes
   * @returns New survival event
   */
  static createSurvivalEvent(
    id: string,
    day: number,
    description: string,
    agentIds: string[],
    location: Position,
    outcomes: Outcome[]
  ): Event {
    const event = new Event(id, day, 'survival' as EventCategory, description, agentIds, location, 5);
    event.addOutcomes(outcomes);
    return event;
  }

  /**
   * Create an exploration event
   * @param id Event ID
   * @param day Day of the event
   * @param description Event description
   * @param agentIds Agent IDs involved
   * @param location Event location
   * @param outcomes Event outcomes
   * @returns New exploration event
   */
  static createExplorationEvent(
    id: string,
    day: number,
    description: string,
    agentIds: string[],
    location: Position,
    outcomes: Outcome[]
  ): Event {
    const event = new Event(id, day, 'exploration' as EventCategory, description, agentIds, location, 4);
    event.addOutcomes(outcomes);
    return event;
  }

  /**
   * Create a social event
   * @param id Event ID
   * @param day Day of the event
   * @param description Event description
   * @param agentIds Agent IDs involved
   * @param location Event location
   * @param outcomes Event outcomes
   * @returns New social event
   */
  static createSocialEvent(
    id: string,
    day: number,
    description: string,
    agentIds: string[],
    location: Position,
    outcomes: Outcome[]
  ): Event {
    const event = new Event(id, day, 'social' as EventCategory, description, agentIds, location, 6);
    event.addOutcomes(outcomes);
    return event;
  }

  /**
   * Create a dungeon event
   * @param id Event ID
   * @param day Day of the event
   * @param description Event description
   * @param agentIds Agent IDs involved
   * @param location Event location
   * @param dungeonId Dungeon ID
   * @param outcomes Event outcomes
   * @param success Whether the dungeon challenge was successful
   * @returns New dungeon event
   */
  static createDungeonEvent(
    id: string,
    day: number,
    description: string,
    agentIds: string[],
    location: Position,
    dungeonId: string,
    outcomes: Outcome[],
    success: boolean
  ): Event {
    // Dungeon events are very important, especially successful ones
    const importance = success ? 9 : 7;
    
    const event = new Event(id, day, 'dungeon' as EventCategory, description, agentIds, location, importance);
    event.setDungeonId(dungeonId);
    event.addOutcomes(outcomes);
    return event;
  }

  /**
   * Create a random event
   * @param id Event ID
   * @param day Day of the event
   * @param description Event description
   * @param agentIds Agent IDs involved
   * @param location Event location
   * @param outcomes Event outcomes
   * @param importance Event importance (1-10)
   * @returns New random event
   */
  static createRandomEvent(
    id: string,
    day: number,
    description: string,
    agentIds: string[],
    location: Position,
    outcomes: Outcome[],
    importance: number
  ): Event {
    const event = new Event(id, day, 'random' as EventCategory, description, agentIds, location, importance);
    event.addOutcomes(outcomes);
    return event;
  }
}