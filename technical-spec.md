# MOG-Simulator Technical Specification

This document provides detailed technical specifications for implementing the Maze of Gods (MOG) Simulator.

## Data Models

### Cell
```typescript
interface Cell {
  id: string;
  type: 'wall' | 'path' | 'basin' | 'dungeon';
  position: { x: number, y: number };
  resources: {
    food: number;
    water: number;
  };
  occupants: Agent[];
  discovered: boolean; // Whether this cell has been seen by any agent
  basinId?: string; // If type is 'basin', which basin it belongs to
  dungeonId?: string; // If type is 'dungeon', which dungeon it belongs to
}
```

### Agent
```typescript
interface Agent {
  id: string;
  name: string;
  status: 'alive' | 'injured' | 'dead';
  location: { x: number, y: number };
  basinOrigin: string; // ID of the basin they started in
  stats: {
    health: number; // 0-100
    hunger: number; // 0-100, decreases over time
    thirst: number; // 0-100, decreases over time
    energy: number; // 0-100, decreases with movement
    morale: number; // 0-100, affects decision making
  };
  birthright: Birthright;
  augment: Augment | null;
  inventory: Item[];
  knownMap: Set<string>; // Cell IDs that this agent has discovered
  relationships: Record<string, number>; // Agent ID -> relationship value (-100 to 100)
  history: Event[]; // Events this agent has been involved in
  achievements: Achievement[]; // Notable accomplishments
  isNotable: boolean; // Whether this agent is considered notable
  daysSurvived: number; // How many days this agent has survived
}
```

### Basin
```typescript
interface Basin {
  id: string;
  name: string;
  location: { x: number, y: number };
  radius: number; // Size of the basin area
  population: Agent[];
  resources: {
    food: number;
    water: number;
  };
  structures: Structure[]; // Built improvements
  history: Event[]; // Events that occurred in this basin
}
```

### Dungeon
```typescript
interface Dungeon {
  id: string;
  name: string;
  location: { x: number, y: number };
  difficulty: number; // 1-10, affects success chance
  augmentReward: Augment; // The augment granted upon completion
  challengesCompleted: number; // How many agents have completed this dungeon
  history: Event[]; // Events related to this dungeon
}
```

### Birthright
```typescript
interface Birthright {
  id: string;
  name: string;
  description: string;
  effects: Effect[]; // Stat modifiers or special abilities
}
```

### Augment
```typescript
interface Augment {
  id: string;
  name: string;
  description: string;
  effects: Effect[]; // Powerful abilities or stat boosts
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}
```

### Event
```typescript
interface Event {
  id: string;
  day: number;
  type: string; // Category of event
  description: string; // Human-readable description
  agents: string[]; // IDs of agents involved
  location: { x: number, y: number };
  basinId?: string; // Basin involved, if any
  dungeonId?: string; // Dungeon involved, if any
  outcomes: Outcome[]; // Effects of this event
  importance: number; // 1-10, used for filtering and highlighting
}
```

### Item
```typescript
interface Item {
  id: string;
  name: string;
  type: 'food' | 'water' | 'tool' | 'weapon' | 'medicine';
  effects: Effect[];
  quantity: number;
}
```

### Structure
```typescript
interface Structure {
  id: string;
  name: string;
  type: string;
  effects: Effect[];
  buildDay: number;
  condition: number; // 0-100
}
```

### Achievement
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  day: number;
  importance: number; // 1-10
}
```

## Algorithms

### Maze Generation

1. **Randomized Prim's Algorithm**:
   - Start with a grid of walls
   - Pick a random cell, mark it as a path
   - Add all neighboring walls to a wall list
   - While the wall list is not empty:
     - Pick a random wall from the list
     - If only one of the two cells the wall divides is a path:
       - Make the wall a path
       - Add neighboring walls to the wall list
     - Remove the wall from the list

2. **Connectivity Validation**:
   - Use a flood fill algorithm starting from any path cell
   - Count the number of cells reached
   - If count < total path cells, there are isolated areas
   - For each isolated area:
     - Find the shortest possible connection to the main maze
     - Convert walls to paths to create this connection

3. **Basin Placement**:
   - Select N random path cells that are at least M distance apart
   - For each selected cell:
     - Convert it and surrounding cells to basin type
     - Ensure each basin has at least one exit path

4. **Dungeon Placement**:
   - Select K random path cells that are at least L distance from any basin
   - Convert these cells to dungeon type
   - Ensure each dungeon has exactly one entrance path

5. **Resource Distribution**:
   - Assign high resource values to basin cells
   - Create resource gradients that decrease with distance from basins
   - Add random resource hotspots throughout the maze

### Agent Decision Making

1. **Priority System**:
   ```
   function decideAction(agent) {
     // Priority 1: Survival
     if (agent.stats.hunger < 30 || agent.stats.thirst < 30) {
       return findResourceAction(agent);
     }
     
     // Priority 2: Safety
     if (agent.stats.health < 50 || isInDanger(agent)) {
       return findSafetyAction(agent);
     }
     
     // Priority 3: Advancement
     if (agent.stats.hunger > 70 && agent.stats.thirst > 70 && agent.stats.health > 80) {
       // Chance to attempt dungeon based on personality
       if (shouldAttemptDungeon(agent)) {
         return createDungeonAction(agent);
       }
       
       // Otherwise explore
       return createExplorationAction(agent);
     }
     
     // Default: Rest and recover
     return createRestAction(agent);
   }
   ```

2. **Pathfinding (A* Algorithm)**:
   - Used for agent navigation to resources, safety, or exploration targets
   - Accounts for agent's known map (they can only pathfind to discovered cells)
   - Includes heuristics for unknown areas based on last known information

3. **Group Behavior**:
   - Agents from the same basin have a tendency to stick together
   - Implements a simple flocking algorithm (separation, alignment, cohesion)
   - Includes leadership dynamics where agents with higher stats influence others

4. **Notable Character Detection**:
   - Tracks achievements and survival metrics for each agent
   - Calculates a "notability score" based on:
     - Days survived
     - Dungeons completed
     - Resources gathered
     - Other agents helped/harmed
     - Structures built
   - Agents above a threshold score are marked as "notable"
   - Notable agents receive special treatment in event generation and UI

### Event Generation

1. **Event Types**:
   - Survival events (finding food/water, starvation, dehydration)
   - Exploration events (discovering new areas, finding resources)
   - Social events (meeting other agents, forming alliances, conflicts)
   - Dungeon events (attempting challenges, gaining augments)
   - Random events (weather, maze shifts, mysterious occurrences)

2. **Event Probability**:
   - Each event type has a base probability
   - Modified by agent stats, traits, and environment
   - Notable characters have higher chances of significant events
   - Events become more dramatic as simulation progresses

3. **Event Outcome Calculation**:
   - Determines success/failure based on agent stats and random chance
   - Applies appropriate effects to agents, resources, and environment
   - Generates descriptive text for the event log

### Time Acceleration

1. **Batch Processing**:
   - Process multiple simulation days in a single operation
   - Optimize by reducing rendering and UI updates during acceleration
   - Maintain a queue of significant events that occurred during acceleration

2. **Summary Generation**:
   - After acceleration, generate a summary of key events
   - Prioritize events involving notable characters
   - Group similar events for concise reporting

3. **Auto-Pause Triggers**:
   - Define conditions that will automatically pause acceleration
   - Examples: agent death, dungeon completion, basin depletion

## Component Structure

### Core Components

1. **App**: Main application container
   - Manages global state and routing
   - Handles initialization and configuration

2. **SimulationProvider**: Context provider for simulation state
   - Manages the simulation engine
   - Provides access to simulation state and actions

3. **MazeGrid**: Visual representation of the maze
   - Renders cells based on their type
   - Handles viewport and camera controls
   - Displays agents and their movements

4. **ControlPanel**: Simulation control interface
   - Start/pause/reset buttons
   - Speed control slider
   - Time acceleration controls

5. **EventLog**: Display of simulation events
   - Scrollable list of event descriptions
   - Filtering options by type, agent, basin
   - Highlighting for important events

6. **ConfigPanel**: Configuration interface
   - Seed input for maze generation
   - Basin count and population settings
   - Initial casualty rate configuration

7. **StatsPanel**: Display of simulation statistics
   - Population counts and demographics
   - Resource levels and distribution
   - Notable character information

8. **HistoryViewer**: Interface for reviewing past events
   - Timeline visualization
   - Filtering by character, basin, event type
   - Search functionality

### Utility Components

1. **Cell**: Individual maze cell rendering
   - Handles different cell type appearances
   - Manages cell state and interactions

2. **Agent**: Visual representation of an agent
   - Renders agent based on status and traits
   - Handles selection and highlighting

3. **EventItem**: Individual event display
   - Formats event text with appropriate styling
   - Handles event importance highlighting

4. **NotableCharacterCard**: Display for notable character information
   - Shows character stats and achievements
   - Provides history and relationship details

5. **TimeControls**: Interface for time manipulation
   - Standard speed controls
   - Time acceleration input and progress display

## State Management

Using Zustand for state management with the following stores:

1. **simulationStore**: Core simulation state
   - Maze configuration and cell data
   - Current simulation day and status
   - Time control settings

2. **agentStore**: Agent-related state
   - All agent data and statistics
   - Notable character tracking
   - Agent relationships and groups

3. **eventStore**: Event logging and history
   - Current and historical events
   - Filtering and search state
   - Event importance tracking

4. **uiStore**: User interface state
   - Current view and panel visibility
   - Selected elements (agents, cells)
   - UI preferences and settings

## Performance Considerations

1. **Rendering Optimization**:
   - Use React.memo for pure components
   - Implement virtualization for the maze grid
   - Only render visible portions of large mazes

2. **Computation Efficiency**:
   - Batch agent updates for parallel processing
   - Use spatial partitioning for collision and proximity checks
   - Implement caching for pathfinding results

3. **Memory Management**:
   - Limit event history size with pagination
   - Implement data compression for save states
   - Use efficient data structures for spatial queries

4. **Time Acceleration Optimization**:
   - Disable non-essential calculations during acceleration
   - Reduce rendering frequency during fast-forward
   - Use web workers for intensive calculations

## Asset Requirements

1. **Pixel Art Tiles**:
   - Wall tiles (straight, corner, dead-end variations)
   - Path tiles (with variations for wear/usage)
   - Basin tiles (with resource indicators)
   - Dungeon tiles (with visual distinctiveness)

2. **Agent Representations**:
   - Basic agent sprites (with variations for different basins)
   - Status indicators (injured, hungry, thirsty)
   - Notable character highlights
   - Augment visual effects

3. **UI Elements**:
   - Control buttons and sliders
   - Panel backgrounds and borders
   - Icons for resources, stats, and actions
   - Event type indicators

4. **Effects and Animations**:
   - Movement animations
   - Resource collection effects
   - Dungeon challenge visuals
   - Time acceleration indicators

## Implementation Phases

1. **Phase 1: Core Functionality**
   - Basic maze generation
   - Simple agent movement and decisions
   - Minimal UI for visualization

2. **Phase 2: Simulation Depth**
   - Complete agent AI implementation
   - Event generation system
   - Basin and dungeon mechanics

3. **Phase 3: User Experience**
   - Full UI implementation
   - Configuration options
   - Time controls and acceleration

4. **Phase 4: Advanced Features**
   - Notable character system
   - History and filtering
   - Save/load functionality

5. **Phase 5: Polish and Optimization**
   - Visual improvements
   - Performance optimization
   - Final balancing and testing