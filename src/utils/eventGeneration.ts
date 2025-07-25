import { Agent } from '../models/Agent';
import { Cell } from '../models/Cell';
import { Basin } from '../models/Basin';
import { Dungeon } from '../models/Dungeon';
import { Event } from '../models/Event';
import type { EventCategory, Outcome } from '../models/Event';
import type { Position } from '../models/types';

/**
 * Event generation context
 */
export interface EventContext {
  agents: Agent[];
  grid: Cell[][];
  basins: Basin[];
  dungeons: Dungeon[];
  day: number;
  seed?: string;
}

/**
 * Generate events for a day
 * @param context Event generation context
 * @returns Array of generated events
 */
export function generateEvents(context: EventContext): Event[] {
  const events: Event[] = [];
  
  // Generate random events
  const randomEvents = generateRandomEvents(context);
  events.push(...randomEvents);
  
  // Generate agent interaction events
  const interactionEvents = generateInteractionEvents(context);
  events.push(...interactionEvents);
  
  // Generate resource events
  const resourceEvents = generateResourceEvents(context);
  events.push(...resourceEvents);
  
  // Generate dungeon events
  const dungeonEvents = generateDungeonEvents(context);
  events.push(...dungeonEvents);
  
  return events;
}

/**
 * Generate random events
 * @param context Event generation context
 * @returns Array of random events
 */
function generateRandomEvents(context: EventContext): Event[] {
  const { agents, day } = context;
  const events: Event[] = [];
  
  // Only generate random events for living agents
  const livingAgents = agents.filter(agent => agent.status !== 'dead');
  
  // Base chance for a random event is 5% per agent
  for (const agent of livingAgents) {
    if (Math.random() < 0.05) {
      // Generate a random event for this agent
      const event = createRandomEvent(agent, day);
      if (event) {
        events.push(event);
        
        // Apply event outcomes
        applyEventOutcomes(event, context);
      }
    }
  }
  
  return events;
}

/**
 * Generate agent interaction events
 * @param context Event generation context
 * @returns Array of interaction events
 */
function generateInteractionEvents(context: EventContext): Event[] {
  const { agents, day } = context;
  const events: Event[] = [];
  
  // Only consider living agents
  const livingAgents = agents.filter(agent => agent.status !== 'dead');
  
  // Check for agents in the same cell
  const agentsByCell: Record<string, Agent[]> = {};
  
  for (const agent of livingAgents) {
    const cellKey = `${agent.location.x},${agent.location.y}`;
    if (!agentsByCell[cellKey]) {
      agentsByCell[cellKey] = [];
    }
    agentsByCell[cellKey].push(agent);
  }
  
  // Generate interaction events for cells with multiple agents
  for (const cellKey in agentsByCell) {
    const cellAgents = agentsByCell[cellKey];
    if (cellAgents.length > 1) {
      // 20% chance of interaction between agents in the same cell
      if (Math.random() < 0.2) {
        // Pick two random agents
        const agent1 = cellAgents[Math.floor(Math.random() * cellAgents.length)];
        let agent2;
        do {
          agent2 = cellAgents[Math.floor(Math.random() * cellAgents.length)];
        } while (agent1.id === agent2.id);
        
        // Generate interaction event
        const event = createInteractionEvent(agent1, agent2, day);
        if (event) {
          events.push(event);
          
          // Apply event outcomes
          applyEventOutcomes(event, context);
        }
      }
    }
  }
  
  return events;
}

/**
 * Generate resource events
 * @param context Event generation context
 * @returns Array of resource events
 */
function generateResourceEvents(context: EventContext): Event[] {
  const { agents, grid, day } = context;
  const events: Event[] = [];
  
  // Only consider living agents
  const livingAgents = agents.filter(agent => agent.status !== 'dead');
  
  // Check for agents with low resources
  for (const agent of livingAgents) {
    // If agent is very hungry or thirsty, generate a resource event
    if (agent.stats.hunger < 20 || agent.stats.thirst < 20) {
      // 30% chance of finding resources when desperate
      if (Math.random() < 0.3) {
        // Generate resource event
        const event = createResourceEvent(agent, grid, day);
        if (event) {
          events.push(event);
          
          // Apply event outcomes
          applyEventOutcomes(event, context);
        }
      }
    }
  }
  
  return events;
}

/**
 * Generate dungeon events
 * @param context Event generation context
 * @returns Array of dungeon events
 */
function generateDungeonEvents(context: EventContext): Event[] {
  const { agents, grid, dungeons, day } = context;
  const events: Event[] = [];
  
  // Only consider living agents
  const livingAgents = agents.filter(agent => agent.status !== 'dead');
  
  // Check for agents in dungeon cells
  for (const agent of livingAgents) {
    const cell = getCellAtPosition(grid, agent.location);
    if (cell && cell.type === 'dungeon') {
      // Find the dungeon
      const dungeon = dungeons.find(d => d.id === cell.dungeonId);
      if (dungeon) {
        // 10% chance of dungeon event
        if (Math.random() < 0.1) {
          // Generate dungeon event
          const event = createDungeonEvent(agent, dungeon, day);
          if (event) {
            events.push(event);
            
            // Apply event outcomes
            applyEventOutcomes(event, context);
          }
        }
      }
    }
  }
  
  return events;
}

/**
 * Create a random event
 * @param agent Agent involved
 * @param grid Maze grid
 * @param day Current day
 * @returns Random event or null
 */
function createRandomEvent(agent: Agent, day: number): Event | null {
  // Define possible random events
  const randomEvents = [
    {
      description: `${agent.name} found a hidden cache of supplies.`,
      category: 'random',
      importance: 4,
      outcomes: [
        {
          type: 'food',
          targetId: agent.id,
          targetType: 'agent',
          value: 20,
          description: 'Found food'
        },
        {
          type: 'water',
          targetId: agent.id,
          targetType: 'agent',
          value: 20,
          description: 'Found water'
        },
        {
          type: 'morale',
          targetId: agent.id,
          targetType: 'agent',
          value: 10,
          description: 'Improved morale'
        }
      ]
    },
    {
      description: `${agent.name} narrowly escaped a collapsing tunnel.`,
      category: 'random',
      importance: 5,
      outcomes: [
        {
          type: 'health',
          targetId: agent.id,
          targetType: 'agent',
          value: -10,
          description: 'Minor injuries'
        },
        {
          type: 'energy',
          targetId: agent.id,
          targetType: 'agent',
          value: -20,
          description: 'Lost energy'
        }
      ]
    },
    {
      description: `${agent.name} discovered ancient writings on the maze walls.`,
      category: 'random',
      importance: 6,
      outcomes: [
        {
          type: 'morale',
          targetId: agent.id,
          targetType: 'agent',
          value: 15,
          description: 'Gained insight'
        }
      ]
    },
    {
      description: `${agent.name} was caught in a sudden dust storm.`,
      category: 'random',
      importance: 3,
      outcomes: [
        {
          type: 'health',
          targetId: agent.id,
          targetType: 'agent',
          value: -5,
          description: 'Minor injuries'
        },
        {
          type: 'energy',
          targetId: agent.id,
          targetType: 'agent',
          value: -10,
          description: 'Lost energy'
        }
      ]
    },
    {
      description: `${agent.name} heard strange whispers from deeper in the maze.`,
      category: 'random',
      importance: 4,
      outcomes: [
        {
          type: 'morale',
          targetId: agent.id,
          targetType: 'agent',
          value: -5,
          description: 'Unsettled'
        }
      ]
    }
  ];
  
  // Pick a random event
  const randomEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)];
  
  // Create event
  const eventId = `event-random-${day}-${agent.id}-${Math.floor(Math.random() * 1000)}`;
  const event = new Event(
    eventId,
    day,
    randomEvent.category as EventCategory,
    randomEvent.description,
    [agent.id],
    agent.location,
    randomEvent.importance
  );
  
  // Add outcomes
  event.addOutcomes(randomEvent.outcomes as Outcome[]);
  
  return event;
}

/**
 * Create an interaction event
 * @param agent1 First agent
 * @param agent2 Second agent
 * @param grid Maze grid
 * @param day Current day
 * @returns Interaction event or null
 */
function createInteractionEvent(
  agent1: Agent,
  agent2: Agent,
  day: number
): Event | null {
  // Check if agents are from the same basin
  const sameBasin = agent1.basinOrigin === agent2.basinOrigin;
  
  // Define possible interaction events
  let interactionEvents;
  
  if (sameBasin) {
    // Friendly interactions for agents from the same basin
    interactionEvents = [
      {
        description: `${agent1.name} shared supplies with ${agent2.name}.`,
        category: 'social',
        importance: 3,
        outcomes: [
          {
            type: 'food',
            targetId: agent2.id,
            targetType: 'agent',
            value: 10,
            description: 'Received food'
          },
          {
            type: 'water',
            targetId: agent2.id,
            targetType: 'agent',
            value: 10,
            description: 'Received water'
          },
          {
            type: 'morale',
            targetId: agent1.id,
            targetType: 'agent',
            value: 5,
            description: 'Improved morale from helping'
          },
          {
            type: 'morale',
            targetId: agent2.id,
            targetType: 'agent',
            value: 10,
            description: 'Improved morale from receiving help'
          }
        ]
      },
      {
        description: `${agent1.name} and ${agent2.name} exchanged information about the maze.`,
        category: 'social',
        importance: 4,
        outcomes: [
          {
            type: 'morale',
            targetId: agent1.id,
            targetType: 'agent',
            value: 5,
            description: 'Gained knowledge'
          },
          {
            type: 'morale',
            targetId: agent2.id,
            targetType: 'agent',
            value: 5,
            description: 'Gained knowledge'
          }
        ]
      },
      {
        description: `${agent1.name} helped ${agent2.name} treat a minor injury.`,
        category: 'social',
        importance: 5,
        outcomes: [
          {
            type: 'health',
            targetId: agent2.id,
            targetType: 'agent',
            value: 15,
            description: 'Healed injury'
          },
          {
            type: 'morale',
            targetId: agent1.id,
            targetType: 'agent',
            value: 5,
            description: 'Improved morale from helping'
          },
          {
            type: 'morale',
            targetId: agent2.id,
            targetType: 'agent',
            value: 10,
            description: 'Improved morale from receiving help'
          }
        ]
      }
    ];
  } else {
    // Mixed interactions for agents from different basins
    interactionEvents = [
      {
        description: `${agent1.name} and ${agent2.name} cautiously traded supplies.`,
        category: 'social',
        importance: 4,
        outcomes: [
          {
            type: 'food',
            targetId: agent2.id,
            targetType: 'agent',
            value: 5,
            description: 'Received food'
          },
          {
            type: 'water',
            targetId: agent1.id,
            targetType: 'agent',
            value: 5,
            description: 'Received water'
          }
        ]
      },
      {
        description: `${agent1.name} and ${agent2.name} had a tense standoff.`,
        category: 'social',
        importance: 5,
        outcomes: [
          {
            type: 'morale',
            targetId: agent1.id,
            targetType: 'agent',
            value: -5,
            description: 'Stress from confrontation'
          },
          {
            type: 'morale',
            targetId: agent2.id,
            targetType: 'agent',
            value: -5,
            description: 'Stress from confrontation'
          },
          {
            type: 'energy',
            targetId: agent1.id,
            targetType: 'agent',
            value: -5,
            description: 'Lost energy'
          },
          {
            type: 'energy',
            targetId: agent2.id,
            targetType: 'agent',
            value: -5,
            description: 'Lost energy'
          }
        ]
      },
      {
        description: `${agent1.name} fought with ${agent2.name} over resources.`,
        category: 'combat',
        importance: 7,
        outcomes: [
          {
            type: 'health',
            targetId: agent1.id,
            targetType: 'agent',
            value: -20,
            description: 'Injured in fight'
          },
          {
            type: 'health',
            targetId: agent2.id,
            targetType: 'agent',
            value: -15,
            description: 'Injured in fight'
          },
          {
            type: 'energy',
            targetId: agent1.id,
            targetType: 'agent',
            value: -15,
            description: 'Lost energy'
          },
          {
            type: 'energy',
            targetId: agent2.id,
            targetType: 'agent',
            value: -15,
            description: 'Lost energy'
          }
        ]
      }
    ];
  }
  
  // Pick a random event
  const interactionEvent = interactionEvents[Math.floor(Math.random() * interactionEvents.length)];
  
  // Create event
  const eventId = `event-interaction-${day}-${agent1.id}-${agent2.id}`;
  const event = new Event(
    eventId,
    day,
    interactionEvent.category as EventCategory,
    interactionEvent.description,
    [agent1.id, agent2.id],
    agent1.location,
    interactionEvent.importance
  );
  
  // Add outcomes
  event.addOutcomes(interactionEvent.outcomes as Outcome[]);
  
  return event;
}

/**
 * Create a resource event
 * @param agent Agent involved
 * @param grid Maze grid
 * @param basins Array of basins
 * @param day Current day
 * @returns Resource event or null
 */
function createResourceEvent(
  agent: Agent,
  grid: Cell[][],
  day: number
): Event | null {
  // Check if agent is in a basin
  const cell = getCellAtPosition(grid, agent.location);
  const inBasin = cell && cell.type === 'basin';
  
  // Define possible resource events
  let resourceEvents;
  
  if (inBasin) {
    // Resource events in basins
    resourceEvents = [
      {
        description: `${agent.name} found a fresh water source in the basin.`,
        category: 'resource',
        importance: 4,
        outcomes: [
          {
            type: 'water',
            targetId: agent.id,
            targetType: 'agent',
            value: 30,
            description: 'Found water'
          },
          {
            type: 'morale',
            targetId: agent.id,
            targetType: 'agent',
            value: 10,
            description: 'Improved morale'
          }
        ]
      },
      {
        description: `${agent.name} harvested edible plants growing in the basin.`,
        category: 'resource',
        importance: 4,
        outcomes: [
          {
            type: 'food',
            targetId: agent.id,
            targetType: 'agent',
            value: 25,
            description: 'Found food'
          },
          {
            type: 'morale',
            targetId: agent.id,
            targetType: 'agent',
            value: 5,
            description: 'Improved morale'
          }
        ]
      }
    ];
  } else {
    // Resource events outside basins
    resourceEvents = [
      {
        description: `${agent.name} found a small puddle of water.`,
        category: 'resource',
        importance: 3,
        outcomes: [
          {
            type: 'water',
            targetId: agent.id,
            targetType: 'agent',
            value: 15,
            description: 'Found water'
          }
        ]
      },
      {
        description: `${agent.name} caught a small creature for food.`,
        category: 'resource',
        importance: 3,
        outcomes: [
          {
            type: 'food',
            targetId: agent.id,
            targetType: 'agent',
            value: 20,
            description: 'Found food'
          }
        ]
      },
      {
        description: `${agent.name} found some edible fungi growing on the walls.`,
        category: 'resource',
        importance: 2,
        outcomes: [
          {
            type: 'food',
            targetId: agent.id,
            targetType: 'agent',
            value: 10,
            description: 'Found food'
          }
        ]
      }
    ];
  }
  
  // Pick a random event
  const resourceEvent = resourceEvents[Math.floor(Math.random() * resourceEvents.length)];
  
  // Create event
  const eventId = `event-resource-${day}-${agent.id}-${Math.floor(Math.random() * 1000)}`;
  const event = new Event(
    eventId,
    day,
    resourceEvent.category as EventCategory,
    resourceEvent.description,
    [agent.id],
    agent.location,
    resourceEvent.importance
  );
  
  // Add basin ID if in basin
  if (inBasin && cell?.basinId) {
    event.setBasinId(cell.basinId);
  }
  
  // Add outcomes
  event.addOutcomes(resourceEvent.outcomes as Outcome[]);
  
  return event;
}

/**
 * Create a dungeon event
 * @param agent Agent involved
 * @param dungeon Dungeon involved
 * @param day Current day
 * @returns Dungeon event or null
 */
function createDungeonEvent(agent: Agent, dungeon: Dungeon, day: number): Event | null {
  // Define possible dungeon events
  const dungeonEvents = [
    {
      description: `${agent.name} discovered ancient technology in the ${dungeon.name}.`,
      category: 'dungeon',
      importance: 7,
      outcomes: [
        {
          type: 'morale',
          targetId: agent.id,
          targetType: 'agent',
          value: 20,
          description: 'Excitement from discovery'
        }
      ]
    },
    {
      description: `${agent.name} was tested by strange puzzles in the ${dungeon.name}.`,
      category: 'dungeon',
      importance: 6,
      outcomes: [
        {
          type: 'energy',
          targetId: agent.id,
          targetType: 'agent',
          value: -20,
          description: 'Mental exertion'
        },
        {
          type: 'morale',
          targetId: agent.id,
          targetType: 'agent',
          value: 10,
          description: 'Satisfaction from solving puzzles'
        }
      ]
    },
    {
      description: `${agent.name} encountered a guardian in the ${dungeon.name}.`,
      category: 'dungeon',
      importance: 8,
      outcomes: [
        {
          type: 'health',
          targetId: agent.id,
          targetType: 'agent',
          value: -30,
          description: 'Injured by guardian'
        },
        {
          type: 'energy',
          targetId: agent.id,
          targetType: 'agent',
          value: -25,
          description: 'Exhausted from battle'
        }
      ]
    }
  ];
  
  // Pick a random event
  const dungeonEvent = dungeonEvents[Math.floor(Math.random() * dungeonEvents.length)];
  
  // Create event
  const eventId = `event-dungeon-${day}-${agent.id}-${dungeon.id}`;
  const event = new Event(
    eventId,
    day,
    dungeonEvent.category as EventCategory,
    dungeonEvent.description,
    [agent.id],
    agent.location,
    dungeonEvent.importance
  );
  
  // Set dungeon ID
  event.setDungeonId(dungeon.id);
  
  // Add outcomes
  event.addOutcomes(dungeonEvent.outcomes as Outcome[]);
  
  return event;
}

/**
 * Apply event outcomes to agents, cells, basins, and dungeons
 * @param event Event to apply
 * @param context Event generation context
 */
function applyEventOutcomes(event: Event, context: EventContext): void {
  const { agents, grid, basins, dungeons } = context;
  
  for (const outcome of event.outcomes) {
    const { targetId, targetType, type, value } = outcome;
    
    switch (targetType) {
      case 'agent': {
        // Find agent
        const agent = agents.find(a => a.id === targetId);
        if (agent) {
          // Apply outcome based on type
          switch (type) {
            case 'health':
              agent.stats.health = Math.max(0, Math.min(100, agent.stats.health + value));
              // Update status based on health
              if (agent.stats.health <= 0) {
                agent.status = 'dead';
              } else if (agent.stats.health < 30) {
                agent.status = 'injured';
              } else if (agent.status === 'injured' && agent.stats.health > 50) {
                agent.status = 'alive';
              }
              break;
            case 'hunger':
            case 'food':
              agent.stats.hunger = Math.max(0, Math.min(100, agent.stats.hunger + value));
              break;
            case 'thirst':
            case 'water':
              agent.stats.thirst = Math.max(0, Math.min(100, agent.stats.thirst + value));
              break;
            case 'energy':
              agent.stats.energy = Math.max(0, Math.min(100, agent.stats.energy + value));
              break;
            case 'morale':
              agent.stats.morale = Math.max(0, Math.min(100, agent.stats.morale + value));
              break;
          }
          
          // Add event to agent's history
          agent.addHistoryEvent(event.day, event.description);
        }
        break;
      }
      
      case 'cell': {
        // Find cell
        const [x, y] = targetId.split(',').map(Number);
        const cell = getCellAtPosition(grid, { x, y });
        if (cell) {
          // Apply outcome based on type
          switch (type) {
            case 'food':
              cell.resources.food = Math.max(0, cell.resources.food + value);
              break;
            case 'water':
              cell.resources.water = Math.max(0, cell.resources.water + value);
              break;
          }
          
          // Mark cell as discovered
          cell.markDiscovered();
        }
        break;
      }
      
      case 'basin': {
        // Find basin
        const basin = basins.find(b => b.id === targetId);
        if (basin) {
          // Apply outcome based on type
          switch (type) {
            case 'food':
              basin.resources.food = Math.max(0, basin.resources.food + value);
              break;
            case 'water':
              basin.resources.water = Math.max(0, basin.resources.water + value);
              break;
          }
          
          // Add event to basin's history
          basin.addHistoryEvent(event.day, event.description);
        }
        break;
      }
      
      case 'dungeon': {
        // Find dungeon
        const dungeon = dungeons.find(d => d.id === targetId);
        if (dungeon) {
          // Add event to dungeon's history
          const dungeonEvent = {
            id: `dungeon-event-${event.id}`,
            day: event.day,
            agentId: event.agentIds[0],
            agentName: agents.find(a => a.id === event.agentIds[0])?.name || 'Unknown',
            success: false,
            description: event.description
          };
          
          dungeon.history.push(dungeonEvent);
        }
        break;
      }
    }
  }
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
 * Format events as strings for display
 * @param events Array of events
 * @returns Array of event strings
 */
export function formatEvents(events: Event[]): string[] {
  return events.map(event => event.getFormattedString());
}

/**
 * Filter events by agent
 * @param events Array of events
 * @param agentId Agent ID
 * @returns Array of events involving the agent
 */
export function filterEventsByAgent(events: Event[], agentId: string): Event[] {
  return events.filter(event => event.involvesAgent(agentId));
}

/**
 * Filter events by basin
 * @param events Array of events
 * @param basinId Basin ID
 * @returns Array of events involving the basin
 */
export function filterEventsByBasin(events: Event[], basinId: string): Event[] {
  return events.filter(event => event.involvesBasin(basinId));
}

/**
 * Filter events by dungeon
 * @param events Array of events
 * @param dungeonId Dungeon ID
 * @returns Array of events involving the dungeon
 */
export function filterEventsByDungeon(events: Event[], dungeonId: string): Event[] {
  return events.filter(event => event.involvesDungeon(dungeonId));
}

/**
 * Filter events by category
 * @param events Array of events
 * @param category Event category
 * @returns Array of events of the specified category
 */
export function filterEventsByCategory(events: Event[], category: EventCategory): Event[] {
  return events.filter(event => event.category === category);
}

/**
 * Filter events by importance
 * @param events Array of events
 * @param minImportance Minimum importance level
 * @returns Array of events with importance >= minImportance
 */
export function filterEventsByImportance(events: Event[], minImportance: number): Event[] {
  return events.filter(event => event.importance >= minImportance);
}

/**
 * Filter events by day range
 * @param events Array of events
 * @param startDay Start day (inclusive)
 * @param endDay End day (inclusive)
 * @returns Array of events within the day range
 */
export function filterEventsByDayRange(events: Event[], startDay: number, endDay: number): Event[] {
  return events.filter(event => event.day >= startDay && event.day <= endDay);
}