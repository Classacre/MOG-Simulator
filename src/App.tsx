import { useReducer, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  IconButton,
  Select,
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import { FaSun, FaMoon } from 'react-icons/fa';
import './App.css';
import MazeGrid from './components/MazeGrid/MazeGrid';
import { Cell } from './models/Cell';
import { Basin } from './models/Basin';
import type { DungeonEvent } from './models/Dungeon';
import { Agent } from './models/Agent';
import type { IAgent, Birthright } from './models/types';
import { generateCompleteMaze } from './utils/mazeGeneration';
import { updateAgents } from './utils/decisionMaking';
import { generateEvents, formatEvents } from './utils/eventGeneration';
import { appReducer, type AppState } from './state';
import type { ValueChangeDetails } from '@zag-js/select';
import { createListCollection } from '@ark-ui/react/select';

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
    useSVGMode: false,
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
  selectedCell: null,
  notableAgents: [],
  events: [],
  dungeonEvents: [],
};

const historyFilterItems = {
  columnCount: 1,
  items: [
    { value: 'all', label: 'All Events' },
    { value: 'agent', label: 'By Agent' },
    { value: 'basin', label: 'By Basin' },
    { value: 'dungeon', label: 'By Dungeon' },
  ]
};

function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const {
    isSimulationRunning,
    simulationSpeed,
    currentDay,
    isSkipping,
    historyFilter,
    selectedHistoryId,
    filteredEvents,
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
    selectedCell,
    events,
    dungeonEvents,
  } = state;

  const { theme, setTheme } = useTheme();
  const collection = createListCollection({ items: historyFilterItems.items });

  useEffect(() => {
    dispatch({ type: 'SET_PREFERENCES', payload: { ...preferences, darkMode: theme === 'dark' } });
  }, [theme, preferences]);

  const generateAgentName = (): string => {
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia'];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  };

  const generateBirthright = (): Birthright => {
    const birthrights: Birthright[] = [
      { id: 'br-1', name: 'Enhanced Vision', description: '+5% resource find', effects: [] },
      { id: 'br-2', name: 'Calm Presence', description: '-10% social conflict', effects: [] },
    ];
    return birthrights[Math.floor(Math.random() * birthrights.length)];
  };

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
    []
  );

  const updateFilteredEvents = useCallback((allEvents: string[]) => {
    if (historyFilter === 'all' || !selectedHistoryId) {
      dispatch({ type: 'SET_FILTERED_EVENTS', payload: allEvents });
      return;
    }
    
    let filtered: string[];
    
    const agent = historyFilter === 'agent' ? agents.find(a => a.id === selectedHistoryId) : null;
    const basin = historyFilter === 'basin' ? basins.find(b => b.id === selectedHistoryId) : null;
    const dungeon = historyFilter === 'dungeon' ? dungeons.find(d => d.id === selectedHistoryId) : null;
    
    if (agent) {
      filtered = allEvents.filter(event => event.includes(agent.name));
    } else if (basin) {
      filtered = allEvents.filter(event => {
        if (event.includes(basin.name)) return true;
        const basinAgents = agents.filter(a => a.basinOrigin === basin.id);
        return basinAgents.some(a => event.includes(a.name));
      });
    } else if (dungeon) {
      filtered = allEvents.filter(event => event.includes(dungeon.name));
    } else {
      filtered = allEvents;
    }
    
    dispatch({ type: 'SET_FILTERED_EVENTS', payload: filtered });
  }, [historyFilter, selectedHistoryId, agents, basins, dungeons, dispatch]);

  const nextDay = useCallback(() => {
    const newDay = currentDay + 1;
    const agentEvents = updateAgents(agents, grid, basins, dungeons, newDay);
    const worldEvents = generateEvents({ agents, grid, basins, dungeons, day: newDay, seed: mazeSeed });
    const formattedEvents = [...agentEvents, ...formatEvents(worldEvents)];
    const newDungeonEvents: DungeonEvent[] = [];
    dungeons.forEach(dungeon => {
      newDungeonEvents.push(...dungeon.history.filter(event => event.day === newDay));
    });
    
    const notable = agents.filter(agent => agent.status !== 'dead' && agent.isNotable).sort((a, b) => b.daysSurvived - a.daysSurvived);
    const newEvents = [...events, ...formattedEvents];
    
    dispatch({ type: 'SET_CURRENT_DAY', payload: newDay });
    dispatch({ type: 'SET_EVENTS', payload: newEvents });
    dispatch({ type: 'SET_DUNGEON_EVENTS', payload: [...dungeonEvents, ...newDungeonEvents] });
    dispatch({ type: 'SET_AGENTS', payload: [...agents] });
    dispatch({ type: 'SET_DUNGEONS', payload: [...dungeons] });
    dispatch({ type: 'SET_NOTABLE_AGENTS', payload: notable });
    updateFilteredEvents(newEvents);
  }, [currentDay, agents, grid, basins, dungeons, mazeSeed, events, dungeonEvents, dispatch, updateFilteredEvents]);

  const generateMaze = useCallback(() => {
    dispatch({ type: 'SET_IS_SIMULATION_RUNNING', payload: false });
    dispatch({ type: 'SET_CURRENT_DAY', payload: 0 });
    dispatch({ type: 'SET_EVENTS', payload: [] });
    dispatch({ type: 'SET_SELECTED_AGENT', payload: null });

    const seed = mazeSeed || Math.random().toString(36).substring(2, 15);
    dispatch({ type: 'SET_MAZE_SEED', payload: seed });

    const { grid, basins, dungeons } = generateCompleteMaze(mazeWidth, mazeHeight, basinCount, Math.floor(basinCount * 1.5), seed);

    dispatch({ type: 'SET_GRID', payload: grid });
    dispatch({ type: 'SET_BASINS', payload: basins });
    dispatch({ type: 'SET_DUNGEONS', payload: dungeons });

    const newAgents = generateAgents(basins, populationPerBasin, initialCasualtyRate);
    dispatch({ type: 'SET_AGENTS', payload: newAgents });
  }, [dispatch, mazeSeed, mazeWidth, mazeHeight, basinCount, populationPerBasin, initialCasualtyRate, generateAgents]);

  const intervalRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    generateMaze();
  }, [generateMaze]);

  useEffect(() => {
    if (isSimulationRunning) {
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
    }
    return () => {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current as unknown as number);
      }
    };
  }, [isSimulationRunning, simulationSpeed, nextDay]);

  const toggleSimulation = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIMULATION' });
  }, [dispatch]);

  const resetSimulation = useCallback(() => {
    generateMaze();
  }, [generateMaze]);

  const handleCellClick = useCallback((cell: Cell) => {
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

  const handleAgentClick = useCallback((agent: IAgent) => {
    const agentInstance = agents.find(a => a.id === agent.id);
    if (agentInstance) {
      dispatch({ type: 'SET_SELECTED_AGENT', payload: agentInstance });
      dispatch({ type: 'SET_SELECTED_DUNGEON', payload: null });
    }
  }, [agents, dispatch]);
  
  const viewBasinHistory = useCallback((basinId: string) => {
    dispatch({ type: 'SET_HISTORY_FILTER', payload: 'basin' });
    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: basinId });
    updateFilteredEvents(events);
  }, [dispatch, updateFilteredEvents, events]);

  const resetHistoryFilter = useCallback(() => {
    dispatch({ type: 'SET_HISTORY_FILTER', payload: 'all' });
    dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: null });
    dispatch({ type: 'SET_FILTERED_EVENTS', payload: events });
  }, [dispatch, events]);

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading as="h1" size="xl" fontFamily="Staatliches">
            MOG SIMULATOR
          </Heading>
          <Text fontFamily="Roboto">Maze of Gods Civilization Simulator</Text>
        </Box>
        <Flex align="center">
          <Text mr={4}>Day: {currentDay}</Text>
          <IconButton
            aria-label="Toggle Theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            mr={2}
          >
            {theme === 'light' ? <FaMoon /> : <FaSun />}
          </IconButton>
        </Flex>
      </Flex>

      <Flex wrap="wrap">
        <Box flex="3" mr={4}>
          <Box h="600px" bg={theme === 'light' ? 'gray.100' : 'gray.700'} borderRadius="md" p={4}>
            {grid.length > 0 ? (
              <MazeGrid
                grid={grid}
                agents={agents}
                basins={basins}
                dungeons={dungeons}
                selectedAgent={selectedAgent}
                selectedDungeon={selectedDungeon}
                selectedCell={selectedCell}
                onCellClick={handleCellClick}
                onAgentClick={handleAgentClick}
                onBasinClick={(basin) => viewBasinHistory(basin.id)}
                onDungeonClick={(dungeon) => {
                  dispatch({ type: 'SET_SELECTED_DUNGEON', payload: dungeon });
                }}
                highlightNotable={preferences.highlightNotableAgents}
              />
            ) : (
              <Flex align="center" justify="center" h="100%">
                <Text fontSize="xl">Generating maze...</Text>
              </Flex>
            )}
          </Box>
        </Box>

        <Box flex="1">
          <Box p={4} bg={theme === 'light' ? 'gray.100' : 'gray.700'} borderRadius="md" mb={4}>
            <Heading size="md" mb={2}>Controls</Heading>
            <Button colorScheme={isSimulationRunning ? 'yellow' : 'blue'} onClick={toggleSimulation} disabled={isSkipping} w="100%" mb={2}>
              {isSimulationRunning ? 'Pause' : 'Start'}
            </Button>
            <Button colorScheme="green" onClick={nextDay} disabled={isSimulationRunning || isSkipping} w="100%" mb={2}>
              Next Day
            </Button>
            <Button colorScheme="red" onClick={resetSimulation} disabled={isSkipping} w="100%" mb={4}>
              Reset
            </Button>
          </Box>
          <Box p={4} bg={theme === 'light' ? 'gray.100' : 'gray.700'} borderRadius="md">
            <Heading size="md" mb={2}>Events</Heading>
            <Select.Root
              collection={collection}
              value={[historyFilter]}
              onValueChange={(details: ValueChangeDetails) => {
                const newValue = details.value[0] as 'all' | 'agent' | 'basin' | 'dungeon';
                if (newValue) {
                  dispatch({ type: 'SET_HISTORY_FILTER', payload: newValue });
                  dispatch({ type: 'SET_SELECTED_HISTORY_ID', payload: null });
                  if (newValue === 'all') {
                    resetHistoryFilter();
                  }
                }
              }}
            >
              <Select.Trigger mb={2}>
                <Select.ValueText placeholder="Filter Events..." />
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content>
                  {historyFilterItems.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      <Select.ItemText>{item.label}</Select.ItemText>
                      <Select.ItemIndicator>✓</Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
            <Box h="200px" overflowY="auto" p={2} bg={theme === 'light' ? 'gray.50' : 'gray.800'} borderRadius="md">
              {filteredEvents.map((event, index) => (
                <Text key={index} fontSize="sm">{event}</Text>
              ))}
            </Box>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

export default App;