import { useReducer, useEffect, useRef, useCallback } from 'react';
import './App.css';
import MazeGrid from './components/MazeGrid/MazeGrid';
import SVGMazeGrid from './components/MazeGrid/SVGMazeGrid';
import { Cell } from './models/Cell';
import { Basin } from './models/Basin';
import type { DungeonEvent } from './models/Dungeon';
import { Agent } from './models/Agent';
import type { IAgent, Birthright } from './models/types';
import { generateCompleteMaze } from './utils/mazeGeneration';
import { updateAgents } from './utils/decisionMaking';
import { generateEvents, formatEvents } from './utils/eventGeneration';
import {
  saveSimulation,
  loadSimulation,
  saveToLocalStorage,
  loadFromLocalStorage,
  getSaveList,
  deleteSave,
  exportToFile,
  importFromFile
} from './utils/saveLoad';
import { appReducer, type AppState } from './state';
import { Button, Link, Input } from '@chakra-ui/react'; // Import Chakra UI components

const initialState: AppState = {
  isSimulationRunning: false,
  simulationSpeed: 5,
  currentDay: 0,
  isSkipping: false,
  skipDays: 10,
  historyFilter: 'all',
  selectedHistoryId: null,
  filteredEvents: [],
  saveModalOpen: false,
  loadModalOpen: false,
  saveName: '',
  saveList: [],
  selectedSave: null,
  importFile: null,
  showConfirmation: false,
  confirmationAction: null,
  confirmationMessage: '',
  showTooltip: null,
  tooltipPosition: { x: 0, y: 0 },
  showHelp: false,
  showSettings: false,
  newEventHighlight: false,
  preferences: {
    darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
    showEventNotifications: true,
    autoSaveEnabled: false,
    autoSaveInterval: 10,
    highlightNotableAgents: true,
    soundEffects: false,
    compactUI: false,
    useSVGMode: false
  },
  mazeSeed: '',
  mazeWidth: 50,
  mazeHeight: 50,
  basinCount: 3,
  populationPerBasin: 100,
  initialCasualtyRate: 20,
  grid: [],
  basins: [],
  dungeons: [],
  agents: [],
  selectedAgent: null,
  selectedDungeon: null,
  selectedCell: null, // Initialize selectedCell
  notableAgents: [],
  events: [],
  dungeonEvents: []
};

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const {
    isSimulationRunning,
    simulationSpeed,
    currentDay,
    isSkipping,
    skipDays,
    historyFilter,
    selectedHistoryId,
    filteredEvents,
    saveModalOpen,
    loadModalOpen,
    saveName,
    saveList,
    selectedSave,
    importFile,
    showConfirmation,
    confirmationAction,
    confirmationMessage,
    showTooltip,
    tooltipPosition,
    showHelp,
    showSettings,
    newEventHighlight,
    preferences,
    mazeSeed,
    mazeWidth,
    mazeHeight,
    basinCount,
    populationPerBasin,
    initialCasualtyRate,
    grid,
    basins,
    dungeons,
    agents,
    selectedAgent,
    selectedDungeon,
    selectedCell, // Destructure selectedCell
    notableAgents,
    events,
    dungeonEvents
  } = state;


  // Generate a random agent name
  const generateAgentName = (): string => {
    const firstNames = [
      'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
      'Skyler', 'Reese', 'Parker', 'Blake', 'Dakota', 'Hayden', 'Rowan', 'Kai'
    ];
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia',
      'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Lee'
    ];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  };

  // Generate a random birthright
  const generateBirthright = (): Birthright => {
    const birthrights: Birthright[] = [
      {
        id: 'birthright-1',
        name: 'Enhanced Vision',
        description: '+5% chance to find resources',
        effects: [
          {
            type: 'resource-find',
            value: 5,
            description: 'Increased chance to find resources'
          }
        ]
      },
      {
        id: 'birthright-2',
        name: 'Calming Presence',
        description: '-10% chance of negative social conflict',
        effects: [
          {
            type: 'social-conflict',
            value: -10,
            description: 'Reduced chance of negative social conflict'
          }
        ]
      },
      {
        id: 'birthright-3',
        name: 'Booming Voice',
        description: '+20% chance to successfully call for help',
        effects: [
          {
            type: 'call-help',
            value: 20,
            description: 'Increased chance to call for help'
          }
        ]
      },
      {
        id: 'birthright-4',
        name: 'Efficient Metabolism',
        description: '-15% food and water consumption',
        effects: [
          {
            type: 'resource-consumption',
            value: -15,
            description: 'Reduced resource consumption'
          }
        ]
      },
      {
        id: 'birthright-5',
        name: 'Natural Explorer',
        description: '+10% movement speed',
        effects: [
          {
            type: 'movement',
            value: 10,
            description: 'Increased movement speed'
          }
        ]
      }
    ];
    return birthrights[Math.floor(Math.random() * birthrights.length)];
  };

  // Generate agents for each basin
  const generateAgents = useCallback(
    (
      basins: Basin[],
      populationPerBasin: number,
      casualtyRate: number
    ): Agent[] => {
      const agents: Agent[] = [];
      basins.forEach(basin => {
        for (let i = 0; i < populationPerBasin; i++) {
          const name = generateAgentName();
          const birthright = generateBirthright();
          const agent = new Agent(
            `agent-${basin.id}-${i}`,
            name,
            { ...basin.location },
            basin.id,
            birthright
          );
          if (Math.random() * 100 < casualtyRate) {
            agent.status = 'dead';
          }
          basin.addAgent(agent);
          agents.push(agent);
        }
      });
      return agents;
    },
    [] // No dependencies as generateAgentName and generateBirthright are pure functions
  );

  // Update filtered events based on filter settings
  const updateFilteredEvents = useCallback((allEvents: string[]) => {
    if (historyFilter === 'all' || !selectedHistoryId) {
      dispatch({ type: 'SET_FILTERED_EVENTS', payload: allEvents });
      return;
    }
    
    let filtered: string[];
    
    // Find the relevant entity based on filter type
    const agent = historyFilter === 'agent' ? agents.find(a => a.id === selectedHistoryId) : null;
    const basin = historyFilter === 'basin' ? basins.find(b => b.id === selectedHistoryId) : null;
    const dungeon = historyFilter === 'dungeon' ? dungeons.find(d => d.id === selectedHistoryId) : null;
    
    // Filter events based on the entity type
    if (agent) {
      // Filter events containing the agent's name
      filtered = allEvents.filter(event =>
        event.includes(agent.name)
      );
    } else if (basin) {
      // Filter events related to a basin
      filtered = allEvents.filter(event => {
        // Include events that mention the basin name
        if (event.includes(basin.name)) return true;
        
        // Include events that mention agents from this basin
        // Find all agents from this basin
        const basinAgents = agents.filter(a => a.basinOrigin === basin.id);
        return basinAgents.some(a => event.includes(a.name));
      });
    } else if (dungeon) {
      // Filter events related to a dungeon
      filtered = allEvents.filter(event =>
        event.includes(dungeon.name)
      );
    } else {
      filtered = allEvents;
    }
    
    dispatch({ type: 'SET_FILTERED_EVENTS', payload: filtered });
  }, [historyFilter, selectedHistoryId, agents, basins, dungeons, dispatch]);

  // Advance simulation by one day
  const nextDay = useCallback(() => {
    // Performance optimization: Batch all state updates
    const newDay = currentDay + 1;
    
    // Update agents and get agent action events
    const agentEvents = updateAgents(agents, grid, basins, dungeons, newDay);

    // Generate world events (resource, social, dungeon, random)
    const worldEvents = generateEvents({
      agents,
      grid,
      basins,
      dungeons,
      day: newDay,
      seed: mazeSeed
    });

    // Format and merge all events
    const formattedEvents = [
      ...agentEvents,
      ...formatEvents(worldEvents)
    ];

    // Collect dungeon events from all dungeons
    const newDungeonEvents: DungeonEvent[] = [];
    dungeons.forEach(dungeon => {
      const latestEvents = dungeon.history.filter(
        event => event.day === newDay
      );
      newDungeonEvents.push(...latestEvents);
    });
    
    // Update notable agents list
    const notable = agents.filter(agent =>
      agent.status !== 'dead' && agent.isNotable
    ).sort((a, b) => b.daysSurvived - a.daysSurvived);
    
    // Performance optimization: Prepare all new state in advance
    const newEvents = [...events, ...formattedEvents];
    const newDungeonEventsState = [...dungeonEvents, ...newDungeonEvents];
    
    // Performance optimization: Batch all state updates
    // React will batch these updates in a single render cycle
    dispatch({ type: 'SET_CURRENT_DAY', payload: newDay });
    dispatch({ type: 'SET_EVENTS', payload: newEvents });
    dispatch({ type: 'SET_DUNGEON_EVENTS', payload: newDungeonEventsState });
    dispatch({ type: 'SET_AGENTS', payload: [...agents] }); // Force update for agent state changes
    dispatch({ type: 'SET_DUNGEONS', payload: [...dungeons] }); // Force update for dungeon state changes
    dispatch({ type: 'SET_NOTABLE_AGENTS', payload: notable });
    
    // Update filtered events based on current filter
    updateFilteredEvents(newEvents);
    
    // Flash event log if new events and notifications are enabled
    if (formattedEvents.length > 0 && preferences.showEventNotifications) {
      dispatch({ type: 'SET_NEW_EVENT_HIGHLIGHT', payload: true });
      setTimeout(() => dispatch({ type: 'SET_NEW_EVENT_HIGHLIGHT', payload: false }), 1000);
    }
    
    // Auto-save if enabled
    if (preferences.autoSaveEnabled && newDay % (preferences.autoSaveInterval * 10) === 0) {
      const autoSaveName = `autosave-${mazeSeed}-day-${newDay}`;
      const state = {
        seed: mazeSeed,
        currentDay: newDay,
        mazeWidth,
        mazeHeight,
        grid,
        basins,
        dungeons,
        agents: [...agents],
        events: newEvents
      };
      
      const saveData = saveSimulation(state);
      saveToLocalStorage(autoSaveName, saveData);
      
      // Update save list
      dispatch({ type: 'SET_SAVE_LIST', payload: getSaveList() });
    }
  }, [currentDay, agents, grid, basins, dungeons, mazeSeed, events, dungeonEvents,
      preferences.showEventNotifications, preferences.autoSaveEnabled, preferences.autoSaveInterval,
      mazeWidth, mazeHeight, dispatch, updateFilteredEvents]);

  // Generate a new maze
  const generateMaze = useCallback(() => {
    dispatch({ type: 'SET_IS_SIMULATION_RUNNING', payload: false });
    dispatch({ type: 'SET_CURRENT_DAY', payload: 0 });
    dispatch({ type: 'SET_EVENTS', payload: [] });
    dispatch({ type: 'SET_SELECTED_AGENT', payload: null });

    const seed = mazeSeed || Math.random().toString(36).substring(2, 15);
    dispatch({ type: 'SET_MAZE_SEED', payload: seed });

    const { grid, basins, dungeons } = generateCompleteMaze(
      mazeWidth,
      mazeHeight,
      basinCount,
      Math.floor(basinCount * 1.5),
      seed
    );

    dispatch({ type: 'SET_GRID', payload: grid });
    dispatch({ type: 'SET_BASINS', payload: basins });
    dispatch({ type: 'SET_DUNGEONS', payload: dungeons });

    const newAgents = generateAgents(basins, populationPerBasin, initialCasualtyRate);
    dispatch({ type: 'SET_AGENTS', payload: newAgents });

    const initialEvents = [
      `Day 0: Simulation initialized with seed "${seed}"`,
      `Day 0: Generated maze with ${mazeWidth}x${mazeHeight} cells`,
      `Day 0: Created ${basins.length} basins and ${dungeons.length} dungeons`,
      `Day 0: Populated with ${newAgents.length} agents (${newAgents.filter(a => a.status === 'alive').length} alive)`
    ];

    dispatch({ type: 'SET_EVENTS', payload: initialEvents });
    dispatch({ type: 'SET_DUNGEON_EVENTS', payload: [] });
    dispatch({ type: 'SET_NOTABLE_AGENTS', payload: [] });
    dispatch({ type: 'SET_FILTERED_EVENTS', payload: initialEvents });
    dispatch({ type: 'SET_HISTORY_FILTER', payload: 'all' });
    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: null });
  }, [dispatch, mazeSeed, mazeWidth, mazeHeight, basinCount, populationPerBasin, initialCasualtyRate, generateAgents]);

  // Simulation animation frame ref
  const intervalRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  // Generate maze on mount
  useEffect(() => {
    generateMaze();
  }, [generateMaze]);

  // Simulation loop
  useEffect(() => {
    if (isSimulationRunning) {
      // Performance optimization: Use requestAnimationFrame for smoother simulation
      let lastFrameTime = 0;
      const frameInterval = 1000 / simulationSpeed;
      
      const runSimulationFrame = (timestamp: number) => {
        if (!isSimulationRunning) return;
        
        const elapsed = timestamp - lastFrameTime;
        
        if (elapsed >= frameInterval) {
          lastFrameTime = timestamp;
          nextDay();
        }
        
        intervalRef.current = requestAnimationFrame(runSimulationFrame);
      };
      
      intervalRef.current = requestAnimationFrame(runSimulationFrame);
    } else if (intervalRef.current) {
      cancelAnimationFrame(intervalRef.current as unknown as number);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
    };
  }, [isSimulationRunning, simulationSpeed, nextDay]);

  // Apply dark mode class to html element
  useEffect(() => {
    const root = window.document.documentElement;
    if (preferences.darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [preferences.darkMode]);

  // Skip days effect
  useEffect(() => {
    if (isSkipping) {
      // Disable normal simulation while skipping
      if (isSimulationRunning) {
        dispatch({ type: 'SET_IS_SIMULATION_RUNNING', payload: false });
      }
      
      let daysSkipped = 0;
      const skipInterval = setInterval(() => {
        nextDay();
        daysSkipped++;
        
        if (daysSkipped >= skipDays) {
          dispatch({ type: 'SET_IS_SKIPPING', payload: false });
          clearInterval(skipInterval);
        }
      }, 50); // Process days much faster when skipping
      
      return () => {
        clearInterval(skipInterval);
      };
    }
  }, [isSkipping, skipDays, isSimulationRunning, nextDay]);

  // Toggle simulation running state
  const toggleSimulation = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIMULATION' });
  }, [dispatch]);

  // Reset simulation with confirmation
  const resetSimulation = useCallback(() => {
    dispatch({ type: 'SET_CONFIRMATION_MESSAGE', payload: 'Are you sure you want to reset the simulation? All progress will be lost.' });
    dispatch({
      type: 'SET_CONFIRMATION_ACTION',
      payload: () => {
        generateMaze();
        dispatch({ type: 'SET_SHOW_CONFIRMATION', payload: false });
      },
    });
    dispatch({ type: 'SET_SHOW_CONFIRMATION', payload: true });
  }, [dispatch, generateMaze]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process shortcuts if no modal is open
      if (saveModalOpen || loadModalOpen || showConfirmation || showHelp) return;
      
      switch (e.key) {
        case ' ': // Space bar - toggle simulation
          e.preventDefault();
          toggleSimulation();
          break;
        case 'n': // N - next day
          if (!isSimulationRunning && !isSkipping) {
            e.preventDefault();
            nextDay();
          }
          break;
        case 'r': // R - reset simulation
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetSimulation();
          }
          break;
        case 's': // S - save simulation
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: 'SET_SAVE_MODAL_OPEN', payload: true });
          }
          break;
        case 'l': // L - load simulation
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: 'SET_SAVE_LIST', payload: getSaveList() });
            dispatch({ type: 'SET_LOAD_MODAL_OPEN', payload: true });
          }
          break;
        case 'h': // H - toggle help
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            dispatch({ type: 'SET_SHOW_HELP', payload: !showHelp });
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSimulationRunning, isSkipping, toggleSimulation, nextDay, resetSimulation,
      saveModalOpen, loadModalOpen, showConfirmation, showHelp, dispatch]);

  // Update filtered events when filter settings change
  useEffect(() => {
    updateFilteredEvents(events);
  }, [historyFilter, selectedHistoryId, events, updateFilteredEvents]);

  // Show tooltip for UI elements
  const handleShowTooltip = (text: string, e: React.MouseEvent) => {
    dispatch({ type: 'SET_SHOW_TOOLTIP', payload: text });
    dispatch({ type: 'SET_TOOLTIP_POSITION', payload: {
      x: e.clientX,
      y: e.clientY + 10 // Offset to show below cursor
    } });
  };
  
  const handleHideTooltip = () => {
    dispatch({ type: 'SET_SHOW_TOOLTIP', payload: null });
  };

  // Handle cell click
  const handleCellClick = useCallback((cell: Cell) => {
    // If cell is a dungeon, select the dungeon
    if (cell.type === 'dungeon' && cell.dungeonId) {
      const dungeon = dungeons.find(d => d.id === cell.dungeonId);
      if (dungeon) {
        dispatch({ type: 'SET_SELECTED_DUNGEON', payload: dungeon });
        dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
      }
    } else {
      dispatch({ type: 'SET_SELECTED_DUNGEON', payload: null });
    }
  }, [dungeons, dispatch]);

  // Handle agent click
  const handleAgentClick = useCallback((agent: IAgent) => {
    const agentInstance = agents.find(a => a.id === agent.id);
    if (agentInstance) {
      dispatch({ type: 'SET_SELECTED_AGENT', payload: agentInstance });
      dispatch({ type: 'SET_SELECTED_DUNGEON', payload: null });
    }
  }, [agents, dispatch]);
  
  // Set history filter to view events for a specific agent
  const viewAgentHistory = useCallback((agentId: string) => {
    dispatch({ type: 'SET_HISTORY_FILTER', payload: 'agent' });
    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: agentId });
    updateFilteredEvents(events);
  }, [dispatch, updateFilteredEvents, events]);
  
  // Set history filter to view events for a specific basin
  const viewBasinHistory = useCallback((basinId: string) => {
    dispatch({ type: 'SET_HISTORY_FILTER', payload: 'basin' });
    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: basinId });
    updateFilteredEvents(events);
  }, [dispatch, updateFilteredEvents, events]);
  
  // Set history filter to view events for a specific dungeon
  const viewDungeonHistory = useCallback((dungeonId: string) => {
    dispatch({ type: 'SET_HISTORY_FILTER', payload: 'dungeon' });
    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: dungeonId });
    updateFilteredEvents(events);
  }, [dispatch, updateFilteredEvents, events]);
  
  // Save the current simulation state
  const handleSave = useCallback(() => {
    if (!saveName) return;
    
    const simulationState = { // Renamed to avoid conflict with dispatch(state)
      seed: mazeSeed,
      currentDay,
      mazeWidth,
      mazeHeight,
      grid,
      basins,
      dungeons,
      agents,
      events
    };
    
    const saveData = saveSimulation(simulationState);
    saveToLocalStorage(saveName, saveData);
    
    // Update save list
    dispatch({ type: 'SET_SAVE_LIST', payload: getSaveList() });
    dispatch({ type: 'SET_SAVE_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_SAVE_NAME', payload: '' });
  }, [saveName, mazeSeed, currentDay, mazeWidth, mazeHeight, grid, basins, dungeons, agents, events, dispatch]);
  
  // Load a saved simulation state
  const handleLoad = useCallback(() => {
    if (!selectedSave) return;
    
    const saveData = loadFromLocalStorage(selectedSave);
    if (!saveData) return;
    
    const loadedState = loadSimulation(saveData); // Renamed to avoid conflict with dispatch(state)
    
    // Update state with loaded data
    dispatch({ type: 'SET_MAZE_SEED', payload: loadedState.seed });
    dispatch({ type: 'SET_CURRENT_DAY', payload: loadedState.currentDay });
    dispatch({ type: 'SET_MAZE_WIDTH', payload: loadedState.mazeWidth });
    dispatch({ type: 'SET_MAZE_HEIGHT', payload: loadedState.mazeHeight });
    dispatch({ type: 'SET_GRID', payload: loadedState.grid });
    dispatch({ type: 'SET_BASINS', payload: loadedState.basins });
    dispatch({ type: 'SET_DUNGEONS', payload: loadedState.dungeons });
    dispatch({ type: 'SET_AGENTS', payload: loadedState.agents });
    dispatch({ type: 'SET_EVENTS', payload: loadedState.events });
    dispatch({ type: 'SET_FILTERED_EVENTS', payload: loadedState.events });
    
    // Close modal
    dispatch({ type: 'SET_LOAD_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_SELECTED_SAVE', payload: null });
  }, [selectedSave, dispatch]);
  
  // Delete a saved simulation state
  const handleDelete = useCallback((name: string) => {
    deleteSave(name);
    dispatch({ type: 'SET_SAVE_LIST', payload: getSaveList() });
    if (selectedSave === name) {
      dispatch({ type: 'SET_SELECTED_SAVE', payload: null });
    }
  }, [selectedSave, dispatch]);
  
  // Export the current simulation state to a file
  const handleExport = useCallback(() => {
    const simulationState = { // Renamed to avoid conflict with dispatch(state)
      seed: mazeSeed,
      currentDay,
      mazeWidth,
      mazeHeight,
      grid,
      basins,
      dungeons,
      agents,
      events
    };
    
    const saveData = saveSimulation(simulationState);
    exportToFile(saveData, `mog-simulator-${mazeSeed}-day-${currentDay}.json`);
  }, [mazeSeed, currentDay, mazeWidth, mazeHeight, grid, basins, dungeons, agents, events]);
  
  // Import a simulation state from a file
  const handleImport = useCallback(async () => {
    if (!importFile) return;
    
    try {
      const saveData = await importFromFile(importFile);
      const state = loadSimulation(saveData);
      
      // Update state with loaded data
      dispatch({ type: 'SET_MAZE_SEED', payload: state.seed });
      dispatch({ type: 'SET_CURRENT_DAY', payload: state.currentDay });
      dispatch({ type: 'SET_MAZE_WIDTH', payload: state.mazeWidth });
      dispatch({ type: 'SET_MAZE_HEIGHT', payload: state.mazeHeight });
      dispatch({ type: 'SET_GRID', payload: state.grid });
      dispatch({ type: 'SET_BASINS', payload: state.basins });
      dispatch({ type: 'SET_DUNGEONS', payload: state.dungeons });
      dispatch({ type: 'SET_AGENTS', payload: state.agents });
      dispatch({ type: 'SET_EVENTS', payload: state.events });
      dispatch({ type: 'SET_FILTERED_EVENTS', payload: state.events });
      
      // Close modal
      dispatch({ type: 'SET_LOAD_MODAL_OPEN', payload: false });
      dispatch({ type: 'SET_IMPORT_FILE', payload: null });
    } catch (error) {
      console.error('Failed to import file:', error);
    }
  }, [importFile, dispatch]); // Removed mazeWidth, mazeHeight from dependencies as they are not used in the callback logic
  
  // Reset history filter to view all events
  const resetHistoryFilter = useCallback(() => {
    dispatch({ type: 'SET_HISTORY_FILTER', payload: 'all' });
    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: null });
    dispatch({ type: 'SET_FILTERED_EVENTS', payload: events });
  }, [dispatch, events]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white p-4">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">MOG-Simulator</h1>
          <p className="text-gray-500 dark:text-gray-400">Maze of Gods Civilization Simulator</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            id="helpButton"
            colorScheme="blue"
            size="sm"
            onClick={() => dispatch({ type: 'SET_SHOW_HELP', payload: true })}
            onMouseEnter={(e) => handleShowTooltip('View help and keyboard shortcuts', e)}
            onMouseLeave={handleHideTooltip}
          >
            Help
          </Button>
          <div className="text-xs text-gray-500 dark:text-gray-400">Day: {currentDay}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content area - Maze Grid */}
        <div className="lg:col-span-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-[600px]">
          {grid.length > 0 ? (
            preferences.useSVGMode ? (
              <SVGMazeGrid
                grid={grid}
                agents={agents}
                basins={basins}
                dungeons={dungeons}
                selectedAgent={selectedAgent}
                selectedDungeon={selectedDungeon}
                selectedCell={selectedCell} // Pass selectedCell
                onCellClick={handleCellClick}
                onAgentClick={handleAgentClick}
                onBasinClick={(basin) => viewBasinHistory(basin.id)}
                onDungeonClick={(dungeon) => {
                  dispatch({ type: 'SET_SELECTED_DUNGEON', payload: dungeon });
                  dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
                  dispatch({ type: 'SET_SELECTED_CELL', payload: null }); // Deselect cell
                }}
                highlightNotable={preferences.highlightNotableAgents}
              />
            ) : (
              <MazeGrid
                grid={grid}
                agents={agents}
                basins={basins}
                dungeons={dungeons}
                selectedAgent={selectedAgent}
                selectedDungeon={selectedDungeon}
                selectedCell={selectedCell} // Pass selectedCell
                onCellClick={handleCellClick}
                onAgentClick={handleAgentClick}
                onBasinClick={(basin) => viewBasinHistory(basin.id)}
                onDungeonClick={(dungeon) => {
                  dispatch({ type: 'SET_SELECTED_DUNGEON', payload: dungeon });
                  dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
                  dispatch({ type: 'SET_SELECTED_CELL', payload: null }); // Deselect cell
                }}
                highlightNotable={preferences.highlightNotableAgents}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xl">Generating maze...</p>
            </div>
          )}
        </div>

        {/* Right sidebar - Controls, Events, Stats */}
        <div className="space-y-4">
          {/* Control Panel */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl">Control Panel</h2>
              <Button
                id="settingsButton"
                colorScheme="gray"
                size="xs"
                onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: true })}
                onMouseEnter={(e) => handleShowTooltip('Open settings', e)}
                onMouseLeave={handleHideTooltip}
              >
                Settings
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                colorScheme={isSimulationRunning ? 'yellow' : 'blue'}
                onClick={() => dispatch({type: 'TOGGLE_SIMULATION'})}
                disabled={isSkipping}
                onMouseEnter={(e) => handleShowTooltip('Start/Pause simulation (Space)', e)}
                onMouseLeave={handleHideTooltip}
              >
                {isSimulationRunning ? 'Pause' : 'Start'}
              </Button>
              <Button
                colorScheme="green"
                onClick={nextDay}
                disabled={isSimulationRunning || isSkipping}
                onMouseEnter={(e) => handleShowTooltip('Advance one day (N)', e)}
                onMouseLeave={handleHideTooltip}
              >
                Next Day
              </Button>
              <Button
                colorScheme="red"
                onClick={resetSimulation}
                disabled={isSkipping}
                onMouseEnter={(e) => handleShowTooltip('Reset simulation (Ctrl+R)', e)}
                onMouseLeave={handleHideTooltip}
              >
                Reset
              </Button>
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center">
                <label htmlFor="speed" className="mr-2 text-sm">Speed:</label>
                <Input
                  type="range"
                  id="speed"
                  min="1"
                  max="20"
                  value={simulationSpeed}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_SIMULATION_SPEED', payload: parseInt(e.target.value) })}
                  width="96px"
                />
                <span className="ml-1 text-sm">{simulationSpeed}x</span>
              </div>
              
              <div className="flex items-center gap-2">
                <label htmlFor="skipDays" className="text-sm">Skip:</label>
                <Input
                  type="number"
                  id="skipDays"
                  min="1"
                  max="100"
                  value={skipDays}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_SKIP_DAYS', payload: parseInt(e.target.value) })}
                  width="64px"
                  size="sm"
                />
                <span className="text-sm">days</span>
                <Button
                  colorScheme="purple"
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_IS_SKIPPING', payload: true })}
                  disabled={isSkipping || isSimulationRunning}
                >
                  Skip
                </Button>
              </div>
            </div>
            
            {/* Save/Load Buttons */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl mb-2">Save/Load</h2>
              <div className="flex space-x-2">
                <Button
                  id="saveButton"
                  colorScheme="blue"
                  onClick={() => dispatch({ type: 'SET_SAVE_MODAL_OPEN', payload: true })}
                  onMouseEnter={(e) => handleShowTooltip('Save simulation (Ctrl+S)', e)}
                  onMouseLeave={handleHideTooltip}
                >
                  Save
                </Button>
                <Button
                  id="loadButton"
                  colorScheme="green"
                  onClick={() => {
                    dispatch({ type: 'SET_SAVE_LIST', payload: getSaveList() });
                    dispatch({ type: 'SET_LOAD_MODAL_OPEN', payload: true });
                  }}
                  onMouseEnter={(e) => handleShowTooltip('Load simulation (Ctrl+L)', e)}
                  onMouseLeave={handleHideTooltip}
                >
                  Load
                </Button>
                <Button
                  id="exportButton"
                  colorScheme="purple"
                  onClick={() => handleExport()}
                  onMouseEnter={(e) => handleShowTooltip('Export simulation to file', e)}
                  onMouseLeave={handleHideTooltip}
                >
                  Export
                </Button>
              </div>
            </div>
            
            {isSkipping && (
              <div className="mt-2 bg-purple-900 rounded p-2 text-center animate-pulse">
                <p className="text-sm">Skipping ahead... Please wait.</p>
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${newEventHighlight ? 'ring-2 ring-yellow-500 transition-all duration-300' : ''}`}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl">Event Log</h2>
              <div className="flex items-center space-x-2">
                <select
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
                  value={historyFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const value = e.target.value as 'all' | 'agent' | 'basin' | 'dungeon';
                    dispatch({ type: 'SET_HISTORY_FILTER', payload: value });
                    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: null });
                    if (value === 'all') {
                      resetHistoryFilter();
                    }
                  }}
                >
                  <option value="all">All Events</option>
                  <option value="agent">By Agent</option>
                  <option value="basin">By Basin</option>
                  <option value="dungeon">By Dungeon</option>
                </select>
                
                {historyFilter !== 'all' && (
                  <select
                    className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
                    value={selectedHistoryId || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: e.target.value });
                    }}
                  >
                    <option value="">Select...</option>
                    {historyFilter === 'agent' && agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                    {historyFilter === 'basin' && basins.map(basin => (
                      <option key={basin.id} value={basin.id}>{basin.name}</option>
                    ))}
                    {historyFilter === 'dungeon' && dungeons.map(dungeon => (
                      <option key={dungeon.id} value={dungeon.id}>{dungeon.name}</option>
                    ))}
                  </select>
                )}
                
                {historyFilter !== 'all' && selectedHistoryId && (
                  <Button
                    size="xs"
                    colorScheme="gray"
                    variant="ghost"
                    onClick={resetHistoryFilter}
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
            
            <div className={`h-[200px] overflow-y-auto bg-white dark:bg-gray-900 p-2 rounded event-log ${preferences.compactUI ? 'text-xs leading-tight' : ''}`}>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event, index) => (
                  <p key={`event-${index}`} className="text-gray-600 dark:text-gray-300 mb-1">
                    {event}
                  </p>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  {events.length > 0 ? 'No events match the current filter.' : 'Events will appear here as the simulation runs.'}
                </p>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl mb-2">Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="bg-white dark:bg-gray-900 p-2 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Day</p>
                <p className="text-xl">{currentDay}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Population</p>
                <p className="text-xl">{agents.filter(a => a.status !== 'dead').length}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Basins</p>
                <p className="text-xl">{basins.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Dungeons</p>
                <p className="text-xl">{dungeons.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Augmented Agents</p>
                <p className="text-xl">{agents.filter(a => a.augment !== null).length}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2 rounded">
                <p className="text-sm text-gray-500 dark:text-gray-400">Dungeon Attempts</p>
                <p className="text-xl">{dungeonEvents.length}</p>
              </div>
            </div>
          </div>
          
          {/* Agent Details (if selected) */}
          {selectedAgent && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl mb-2">Agent Details</h2>
              <div className="bg-white dark:bg-gray-900 p-3 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{selectedAgent.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Status: <span className={
                        selectedAgent.status === 'alive' ? 'text-green-500' :
                        selectedAgent.status === 'injured' ? 'text-yellow-500' :
                        'text-red-500'
                      }>{selectedAgent.status}</span>
                    </p>
                  </div>
                  <Button
                    size="xs"
                    colorScheme="gray"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'SET_SELECTED_AGENT', payload: null })}
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Basin:</span> {' '}
                    <Link
                      className="text-blue-600 dark:text-blue-400"
                      onClick={() => viewBasinHistory(selectedAgent.basinOrigin)}
                    >
                      {basins.find(b => b.id === selectedAgent.basinOrigin)?.name || selectedAgent.basinOrigin}
                    </Link>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Days Survived:</span> {selectedAgent.daysSurvived}
                    <Link
                      ml={2}
                      className="text-blue-600 dark:text-blue-400"
                      fontSize="xs"
                      onClick={() => viewAgentHistory(selectedAgent.id)}
                    >
                      View History
                    </Link>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Location:</span> ({selectedAgent.location.x}, {selectedAgent.location.y})
                  </p>
                </div>
                
                <div className="mt-3">
                  <h4 className="font-bold text-sm border-b border-gray-300 dark:border-gray-700 pb-1 mb-1">Stats</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Health:</span> {selectedAgent.stats.health}%
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Hunger:</span> {selectedAgent.stats.hunger}%
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Thirst:</span> {selectedAgent.stats.thirst}%
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Energy:</span> {selectedAgent.stats.energy}%
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Morale:</span> {selectedAgent.stats.morale}%
                    </p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h4 className="font-bold text-sm border-b border-gray-300 dark:border-gray-700 pb-1 mb-1">Birthright</h4>
                  <p className="text-sm font-medium">{selectedAgent.birthright.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAgent.birthright.description}</p>
                </div>
                
                {selectedAgent.augment && (
                  <div className="mt-3">
                    <h4 className="font-bold text-sm border-b border-gray-300 dark:border-gray-700 pb-1 mb-1">Augment</h4>
                    <p className="text-sm font-medium">{selectedAgent.augment.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAgent.augment.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notable Characters Panel */}
          {notableAgents.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl mb-2">Notable Characters</h2>
              <div className="max-h-[200px] overflow-y-auto">
                {notableAgents.map(agent => (
                  <div
                    key={`notable-${agent.id}`}
                    className="bg-white dark:bg-gray-900 p-2 rounded mb-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => dispatch({ type: 'SET_SELECTED_AGENT', payload: agent })}
                  >
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{
                          backgroundColor: `hsl(${agent.basinOrigin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360}, 70%, 50%)`
                        }}
                      />
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {agent.augment ?
                            `Augmented (${agent.augment.name})` :
                            `Survived ${agent.daysSurvived} days`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dungeon Details (if selected) */}
          {selectedDungeon && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl mb-2">Dungeon Details</h2>
              <div className="bg-white dark:bg-gray-900 p-3 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{selectedDungeon.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Difficulty: <span className={
                        selectedDungeon.difficulty <= 3 ? 'text-green-500' :
                        selectedDungeon.difficulty <= 7 ? 'text-yellow-500' :
                        'text-red-500'
                      }>{selectedDungeon.difficulty}/10</span>
                    </p>
                  </div>
                  <Button
                    size="xs"
                    colorScheme="gray"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'SET_SELECTED_DUNGEON', payload: null })}
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Location:</span> ({selectedDungeon.location.x}, {selectedDungeon.location.y})
                    <Link
                      id="viewDungeonHistoryButton"
                      ml={2}
                      className="text-blue-600 dark:text-blue-400"
                      fontSize="xs"
                      onClick={() => {
                        viewDungeonHistory(selectedDungeon.id);
                        // Scroll to event log
                        const eventLog = document.querySelector('.event-log');
                        if (eventLog) {
                          eventLog.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      View History
                    </Link>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Success Rate:</span> {selectedDungeon.getSuccessRate().toFixed(1)}%
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Attempts:</span> {selectedDungeon.getTotalAttempts()} ({selectedDungeon.getSuccessfulAttempts()} successful, {selectedDungeon.getFailedAttempts()} failed)
                  </p>
                </div>
                
                <div className="mt-3">
                  <h4 className="font-bold text-sm border-b border-gray-300 dark:border-gray-700 pb-1 mb-1">Augment Reward</h4>
                  <p className="text-sm font-medium">{selectedDungeon.augmentReward.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedDungeon.augmentReward.description}</p>
                </div>
                
                {selectedDungeon.history.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-bold text-sm border-b border-gray-300 dark:border-gray-700 pb-1 mb-1">Recent Attempts</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {selectedDungeon.history
                        .slice()
                        .reverse()
                        .slice(0, 5)
                        .map((event, index) => (
                          <div key={`event-${index}`} className="text-xs mb-1 pb-1 border-b border-gray-200 dark:border-gray-800">
                            <p>
                              <span className="text-gray-500 dark:text-gray-400">Day {event.day}:</span> {event.agentName}
                              <span className={event.success ? ' text-green-500' : ' text-red-500'}>
                                {event.success ? ' succeeded' : ' failed'}
                              </span>
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Cell Details (if selected) */}
          {selectedCell && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <h2 className="text-xl mb-2">Cell Details</h2>
              <div className="bg-white dark:bg-gray-900 p-3 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">Cell ({selectedCell.position.x}, {selectedCell.position.y})</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Type: {selectedCell.type}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Discovered: {selectedCell.discovered ? 'Yes' : 'No'}
                    </p>
                    {selectedCell.lastVisitedDay !== undefined && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last Visited: Day {selectedCell.lastVisitedDay}
                      </p>
                    )}
                    {selectedCell.basinId && (
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Basin:</span> {basins.find(b => b.id === selectedCell.basinId)?.name || selectedCell.basinId}
                      </p>
                    )}
                    {selectedCell.dungeonId && (
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Dungeon:</span> {dungeons.find(d => d.id === selectedCell.dungeonId)?.name || selectedCell.dungeonId}
                      </p>
                    )}
                  </div>
                  <Button
                    size="xs"
                    colorScheme="gray"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'SET_SELECTED_CELL', payload: null })}
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="mt-3">
                  <h4 className="font-bold text-sm border-b border-gray-300 dark:border-gray-700 pb-1 mb-1">Resources</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Food:</span> {selectedCell.resources.food}
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Water:</span> {selectedCell.resources.water}
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Health:</span> {selectedCell.resources.health}
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Energy:</span> {selectedCell.resources.energy}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl mb-2">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label htmlFor="seed" className="block mb-1">Maze Seed</label>
            <Input
              type="text"
              id="seed"
              placeholder="Enter seed (optional)"
              value={mazeSeed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_MAZE_SEED', payload: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="mazeWidth" className="block mb-1">Width</label>
            <Input
              type="number"
              id="mazeWidth"
              value={mazeWidth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_MAZE_WIDTH', payload: parseInt(e.target.value) })}
              min="20"
              max="100"
            />
          </div>
          <div>
            <label htmlFor="mazeHeight" className="block mb-1">Height</label>
            <Input
              type="number"
              id="mazeHeight"
              value={mazeHeight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_MAZE_HEIGHT', payload: parseInt(e.target.value) })}
              min="20"
              max="100"
            />
          </div>
          <div>
            <label htmlFor="basinCount" className="block mb-1">Basin Count</label>
            <Input
              type="number"
              id="basinCount"
              value={basinCount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_BASIN_COUNT', payload: parseInt(e.target.value) })}
              min="1"
              max="10"
            />
          </div>
          <div>
            <label htmlFor="populationPerBasin" className="block mb-1">Population Per Basin</label>
            <Input
              type="number"
              id="populationPerBasin"
              value={populationPerBasin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_POPULATION_PER_BASIN', payload: parseInt(e.target.value) })}
              min="10"
              max="500"
            />
          </div>
          <div>
            <label htmlFor="casualtyRate" className="block mb-1">Initial Casualty Rate (%)</label>
            <Input
              type="number"
              id="casualtyRate"
              value={initialCasualtyRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_INITIAL_CASUALTY_RATE', payload: parseInt(e.target.value) })}
              min="0"
              max="90"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            colorScheme="green"
            onClick={generateMaze}
          >
            Generate New Maze
          </Button>
        </div>
      </div>

      <footer className="mt-8 text-center text-gray-600 dark:text-gray-500 text-sm">
        <p>MOG-Simulator &copy; 2025 - A Maze Civilization Simulator</p>
        <p className="mt-1 text-xs">Press Ctrl+H for help and keyboard shortcuts</p>
      </footer>
      
      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 relative text-gray-800 dark:text-white">
            <h2 className="text-xl mb-4">Save Simulation</h2>
            <div className="mb-4">
              <label htmlFor="saveName" className="block mb-1">Save Name</label>
              <Input
                type="text"
                id="saveName"
                value={saveName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_SAVE_NAME', payload: e.target.value })}
                placeholder="Enter save name"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                colorScheme="gray"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: 'SET_SAVE_MODAL_OPEN', payload: false });
                }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (saveName) handleSave();
                }}
                disabled={!saveName}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Load Modal */}
      {loadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 relative text-gray-800 dark:text-white">
            <h2 className="text-xl mb-4">Load Simulation</h2>
            
            {/* Saved Games */}
            {saveList.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg mb-2">Saved Games</h3>
                <div className="max-h-48 overflow-y-auto">
                  {saveList.map(name => (
                    <div
                      key={name}
                      className={`flex justify-between items-center p-2 rounded mb-1 cursor-pointer ${
                        selectedSave === name ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => dispatch({ type: 'SET_SELECTED_SAVE', payload: name })}
                    >
                      <span className="truncate">{name}</span>
                      <Button
                        size="xs"
                        colorScheme="gray"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(name);
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Import File */}
            <div className="mb-4">
              <h3 className="text-lg mb-2">Import from File</h3>
              <Input
                type="file"
                accept=".json"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_IMPORT_FILE', payload: e.target.files?.[0] || null })}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                colorScheme="gray"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: 'SET_LOAD_MODAL_OPEN', payload: false });
                }}
              >
                Cancel
              </Button>
              {importFile ? (
                <Button
                  colorScheme="purple"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleImport();
                  }}
                >
                  Import
                </Button>
              ) : (
                <Button
                  colorScheme="green"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (selectedSave) handleLoad();
                  }}
                  disabled={!selectedSave}
                >
                  Load
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 relative text-gray-800 dark:text-white">
            <h2 className="text-xl mb-4">Confirm Action</h2>
            <p className="mb-4">{confirmationMessage}</p>
            <div className="flex justify-end space-x-2">
              <Button
                colorScheme="gray"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: 'SET_SHOW_CONFIRMATION', payload: false });
                }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirmationAction) {
                    confirmationAction();
                  }
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="fixed bg-gray-700 dark:bg-gray-800 text-white px-3 py-1 rounded shadow-lg text-sm z-[9999]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            pointerEvents: 'none'
          }}
        >
          {showTooltip}
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[500px] relative text-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl">Settings</h2>
              <Button
                size="xs"
                colorScheme="gray"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: 'SET_SHOW_SETTINGS', payload: false });
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="darkMode" className="flex items-center cursor-pointer">
                  <span className="mr-2">Dark Mode</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="darkMode"
                      className="sr-only"
                      checked={preferences.darkMode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, darkMode: e.target.checked } })}
                    />
                    <div className={`block w-10 h-6 rounded-full ${preferences.darkMode ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${preferences.darkMode ? 'transform translate-x-full' : ''}`}></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="showEventNotifications" className="flex items-center cursor-pointer">
                  <span className="mr-2">Event Notifications</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="showEventNotifications"
                      className="sr-only"
                      checked={preferences.showEventNotifications}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, showEventNotifications: e.target.checked } })}
                    />
                    <div className={`block w-10 h-6 rounded-full ${preferences.showEventNotifications ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${preferences.showEventNotifications ? 'transform translate-x-full' : ''}`}></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="highlightNotableAgents" className="flex items-center cursor-pointer">
                  <span className="mr-2">Highlight Notable Agents</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="highlightNotableAgents"
                      className="sr-only"
                      checked={preferences.highlightNotableAgents}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, highlightNotableAgents: e.target.checked } })}
                    />
                    <div className={`block w-10 h-6 rounded-full ${preferences.highlightNotableAgents ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${preferences.highlightNotableAgents ? 'transform translate-x-full' : ''}`}></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="soundEffects" className="flex items-center cursor-pointer">
                  <span className="mr-2">Sound Effects</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="soundEffects"
                      className="sr-only"
                      checked={preferences.soundEffects}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, soundEffects: e.target.checked } })}
                    />
                    <div className={`block w-10 h-6 rounded-full ${preferences.soundEffects ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${preferences.soundEffects ? 'transform translate-x-full' : ''}`}></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="compactUI" className="flex items-center cursor-pointer">
                  <span className="mr-2">Compact UI</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="compactUI"
                      className="sr-only"
                      checked={preferences.compactUI}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, compactUI: e.target.checked } })}
                    />
                    <div className={`block w-10 h-6 rounded-full ${preferences.compactUI ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${preferences.compactUI ? 'transform translate-x-full' : ''}`}></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="useSVGMode" className="flex items-center cursor-pointer">
                  <span className="mr-2">SVG Pixel Art Mode</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="useSVGMode"
                      className="sr-only"
                      checked={preferences.useSVGMode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, useSVGMode: e.target.checked } })}
                    />
                    <div className={`block w-10 h-6 rounded-full ${preferences.useSVGMode ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${preferences.useSVGMode ? 'transform translate-x-full' : ''}`}></div>
                  </div>
                </label>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="autoSaveEnabled" className="flex items-center cursor-pointer">
                    <span className="mr-2">Auto-Save</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="autoSaveEnabled"
                        className="sr-only"
                        checked={preferences.autoSaveEnabled}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, autoSaveEnabled: e.target.checked } })}
                      />
                      <div className={`block w-10 h-6 rounded-full ${preferences.autoSaveEnabled ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${preferences.autoSaveEnabled ? 'transform translate-x-full' : ''}`}></div>
                  </div>
                </label>
                </div>
                
                {preferences.autoSaveEnabled && (
                  <div className="flex items-center mt-2">
                    <label htmlFor="autoSaveInterval" className="mr-2">Save every</label>
                    <Input
                      type="number"
                      id="autoSaveInterval"
                      value={preferences.autoSaveInterval}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, autoSaveInterval: Math.max(1, parseInt(e.target.value)) } })}
                      min="1"
                      max="60"
                      width="64px"
                      size="sm"
                    />
                    <span className="ml-2">minutes</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                colorScheme="blue"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: 'SET_SHOW_SETTINGS', payload: false });
                }}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto relative text-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl">Help & Keyboard Shortcuts</h2>
              <Button
                size="xs"
                colorScheme="gray"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dispatch({ type: 'SET_SHOW_HELP', payload: false });
                }}
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                  <span className="inline-block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">Space</span>
                  Start/Pause simulation
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                  <span className="inline-block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">N</span>
                  Next day
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                  <span className="inline-block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">Ctrl+R</span>
                  Reset simulation
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                  <span className="inline-block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">Ctrl+S</span>
                  Save simulation
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                  <span className="inline-block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">Ctrl+L</span>
                  Load simulation
                </div>
                <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
                  <span className="inline-block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-2">Ctrl+H</span>
                  Show/hide help
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">About MOG-Simulator</h3>
              <p className="mb-2">
                MOG-Simulator (Maze of Gods) is a civilization simulator that places survivor groups
                ("Basins") into a hostile maze environment. Individual agents with unique traits make
                decisions based on their needs, leading to emergent stories of survival, conflict, and
                character progression.
              </p>
              <p>
                Watch as your agents navigate the maze, find resources, explore dungeons, and interact
                with each other. Notable characters will emerge based on their actions and survival.
              </p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">Getting Started</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Configure your maze parameters in the Configuration panel</li>
                <li>Click "Generate New Maze" to create a new simulation</li>
                <li>Press "Start" or Space bar to begin the simulation</li>
                <li>Use the speed slider to adjust simulation speed</li>
                <li>Click on agents or dungeons to view detailed information</li>
                <li>Use the Event Log to track what's happening in the simulation</li>
                <li>Save your progress using the Save button or Ctrl+S</li>
              </ol>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-2">Tips</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use the "Skip" feature to advance multiple days quickly</li>
                <li>Filter the event log to focus on specific agents, basins, or dungeons</li>
                <li>Check the "Notable Characters" panel to see which agents are thriving</li>
                <li>Experiment with different maze configurations to see how they affect survival</li>
                <li>Export your simulation to share with others</li>
                <li>Enable auto-save in Settings to prevent losing progress</li>
                <li>Use the Compact UI option in Settings for larger simulations</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
