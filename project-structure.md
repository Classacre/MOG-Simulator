# MOG-Simulator Project Structure

This document outlines the recommended directory structure and key files for the MOG-Simulator project.

## Directory Structure

```
mog-simulator/
├── public/                     # Static assets
│   ├── favicon.ico
│   └── index.html
├── src/                        # Source code
│   ├── assets/                 # Assets used in the application
│   │   ├── audio/              # Sound effects and music
│   │   │   ├── effects/        # Sound effects
│   │   │   └── music/          # Background music
│   │   ├── images/             # Images and sprites
│   │   │   ├── cells/          # Cell type sprites
│   │   │   ├── agents/         # Agent sprites
│   │   │   ├── ui/             # UI elements
│   │   │   └── effects/        # Visual effects
│   │   └── fonts/              # Custom fonts
│   ├── components/             # React components
│   │   ├── App.jsx             # Main application component
│   │   ├── MazeGrid/           # Maze visualization components
│   │   │   ├── MazeGrid.jsx    # Main grid component
│   │   │   ├── Cell.jsx        # Individual cell component
│   │   │   ├── Agent.jsx       # Agent visualization component
│   │   │   └── Viewport.jsx    # Camera/viewport control
│   │   ├── ControlPanel/       # Simulation control components
│   │   │   ├── ControlPanel.jsx # Main control panel
│   │   │   ├── TimeControls.jsx # Time control buttons and slider
│   │   │   ├── AccelerationControls.jsx # Time acceleration controls
│   │   │   └── SimulationButtons.jsx # Start/pause/reset buttons
│   │   ├── EventLog/           # Event logging components
│   │   │   ├── EventLog.jsx    # Main event log component
│   │   │   ├── EventItem.jsx   # Individual event display
│   │   │   ├── EventFilter.jsx # Filtering controls
│   │   │   └── EventSearch.jsx # Search functionality
│   │   ├── ConfigPanel/        # Configuration components
│   │   │   ├── ConfigPanel.jsx # Main configuration panel
│   │   │   ├── SeedInput.jsx   # Maze seed input
│   │   │   ├── BasinConfig.jsx # Basin configuration
│   │   │   └── PopulationConfig.jsx # Population settings
│   │   ├── StatsPanel/         # Statistics display components
│   │   │   ├── StatsPanel.jsx  # Main statistics panel
│   │   │   ├── PopulationStats.jsx # Population statistics
│   │   │   ├── ResourceStats.jsx # Resource statistics
│   │   │   └── NotableCharacters.jsx # Notable character display
│   │   ├── HistoryViewer/      # History viewing components
│   │   │   ├── HistoryViewer.jsx # Main history component
│   │   │   ├── Timeline.jsx    # Timeline visualization
│   │   │   ├── HistoryFilter.jsx # History filtering
│   │   │   └── CharacterHistory.jsx # Character-specific history
│   │   └── common/             # Common UI components
│   │       ├── Button.jsx      # Reusable button component
│   │       ├── Slider.jsx      # Reusable slider component
│   │       ├── Tooltip.jsx     # Tooltip component
│   │       └── Modal.jsx       # Modal dialog component
│   ├── hooks/                  # Custom React hooks
│   │   ├── useSimulation.js    # Hook for simulation control
│   │   ├── useAgents.js        # Hook for agent management
│   │   ├── useEvents.js        # Hook for event handling
│   │   └── useMaze.js          # Hook for maze operations
│   ├── models/                 # Data models and types
│   │   ├── Cell.js             # Cell model
│   │   ├── Agent.js            # Agent model
│   │   ├── Basin.js            # Basin model
│   │   ├── Dungeon.js          # Dungeon model
│   │   ├── Birthright.js       # Birthright model
│   │   ├── Augment.js          # Augment model
│   │   ├── Event.js            # Event model
│   │   ├── Item.js             # Item model
│   │   └── types.js            # TypeScript type definitions
│   ├── store/                  # Zustand state management
│   │   ├── simulationStore.js  # Core simulation state
│   │   ├── agentStore.js       # Agent-related state
│   │   ├── eventStore.js       # Event logging and history
│   │   └── uiStore.js          # UI state
│   ├── utils/                  # Utility functions
│   │   ├── mazeGeneration.js   # Maze generation algorithms
│   │   ├── pathfinding.js      # Pathfinding algorithms
│   │   ├── decisionMaking.js   # Agent decision making
│   │   ├── eventGeneration.js  # Event generation
│   │   ├── nameGeneration.js   # Random name generation
│   │   ├── seedRandom.js       # Seed-based randomization
│   │   └── timeAcceleration.js # Time acceleration utilities
│   ├── constants/              # Constants and configuration
│   │   ├── cellTypes.js        # Cell type definitions
│   │   ├── agentConstants.js   # Agent-related constants
│   │   ├── eventTypes.js       # Event type definitions
│   │   ├── birthrights.js      # Birthright definitions
│   │   └── augments.js         # Augment definitions
│   ├── services/               # Service modules
│   │   ├── simulationEngine.js # Core simulation engine
│   │   ├── saveLoad.js         # Save/load functionality
│   │   └── analytics.js        # Simulation analytics
│   ├── main.jsx                # Application entry point
│   ├── index.css               # Global styles
│   └── vite-env.d.ts           # Vite environment types
├── .gitignore                  # Git ignore file
├── index.html                  # HTML entry point
├── package.json                # NPM package configuration
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
├── README.md                   # Project README
├── technical-spec.md           # Technical specification
└── project-structure.md        # This file
```

## Key Files and Their Responsibilities

### Core Application Files

- **src/main.jsx**: Entry point for the application, sets up React and renders the App component.
- **src/components/App.jsx**: Main application component, handles routing and global layout.
- **src/services/simulationEngine.js**: Core simulation engine that drives the simulation logic.

### Maze Generation

- **src/utils/mazeGeneration.js**: Contains algorithms for generating the maze, including:
  - Randomized Prim's algorithm implementation
  - Connectivity validation and correction
  - Basin and dungeon placement
  - Resource distribution

### Agent System

- **src/models/Agent.js**: Agent data model and methods.
- **src/utils/decisionMaking.js**: Agent decision-making algorithms.
- **src/utils/pathfinding.js**: Pathfinding algorithms for agent movement.

### Event System

- **src/models/Event.js**: Event data model and methods.
- **src/utils/eventGeneration.js**: Event generation algorithms.
- **src/components/EventLog/EventLog.jsx**: Event display and interaction.

### State Management

- **src/store/simulationStore.js**: Core simulation state management.
- **src/store/agentStore.js**: Agent-related state management.
- **src/store/eventStore.js**: Event and history state management.
- **src/store/uiStore.js**: UI state management.

### User Interface

- **src/components/MazeGrid/MazeGrid.jsx**: Maze visualization component.
- **src/components/ControlPanel/ControlPanel.jsx**: Simulation control interface.
- **src/components/ConfigPanel/ConfigPanel.jsx**: Configuration interface.
- **src/components/StatsPanel/StatsPanel.jsx**: Statistics display.
- **src/components/HistoryViewer/HistoryViewer.jsx**: History viewing interface.

### Notable Character System

- **src/components/StatsPanel/NotableCharacters.jsx**: Notable character display.
- **src/utils/characterRanking.js**: Logic for determining notable characters.

### Time Acceleration

- **src/components/ControlPanel/AccelerationControls.jsx**: Time acceleration UI.
- **src/utils/timeAcceleration.js**: Time acceleration logic.

### History Feature

- **src/components/HistoryViewer/HistoryViewer.jsx**: History viewing interface.
- **src/components/HistoryViewer/Timeline.jsx**: Timeline visualization.
- **src/components/HistoryViewer/CharacterHistory.jsx**: Character-specific history.

## Implementation Approach

1. **Start with Core Functionality**:
   - Set up the project structure
   - Implement basic maze generation
   - Create simple agent movement
   - Build minimal UI for visualization

2. **Add Simulation Depth**:
   - Implement complete agent AI
   - Add event generation system
   - Create basin and dungeon mechanics

3. **Enhance User Experience**:
   - Build full UI components
   - Add configuration options
   - Implement time controls

4. **Implement Advanced Features**:
   - Add notable character system
   - Create history and filtering
   - Implement save/load functionality

5. **Polish and Optimize**:
   - Improve visuals with pixel art
   - Optimize performance
   - Balance simulation parameters