import { Cell } from './models/Cell';
import { Basin } from './models/Basin';
import { Dungeon, type DungeonEvent } from './models/Dungeon';
import { Agent } from './models/Agent';

export interface AppState {
  isSimulationRunning: boolean;
  simulationSpeed: number;
  currentDay: number;
  isSkipping: boolean;
  skipDays: number;
  historyFilter: 'all' | 'agent' | 'basin' | 'dungeon';
  selectedHistoryId: string | null;
  filteredEvents: string[];
  saveModalOpen: boolean;
  loadModalOpen: boolean;
  saveName: string;
  saveList: string[];
  selectedSave: string | null;
  importFile: File | null;
  showConfirmation: boolean;
  confirmationAction: (() => void) | null;
  confirmationMessage: string;
  showTooltip: string | null;
  tooltipPosition: { x: number; y: number };
  showHelp: boolean;
  showSettings: boolean;
  newEventHighlight: boolean;
  preferences: {
    darkMode: boolean;
    showEventNotifications: boolean;
    autoSaveEnabled: boolean;
    autoSaveInterval: number;
    highlightNotableAgents: boolean;
    soundEffects: boolean;
    compactUI: boolean;
    useSVGMode: boolean;
  };
  mazeSeed: string;
  mazeWidth: number;
  mazeHeight: number;
  basinCount: number;
  populationPerBasin: number;
  initialCasualtyRate: number;
  grid: Cell[][];
  basins: Basin[];
  dungeons: Dungeon[];
  agents: Agent[];
  selectedAgent: Agent | null;
  selectedDungeon: Dungeon | null;
  selectedCell: Cell | null; // Added selectedCell
  notableAgents: Agent[];
  events: string[];
  dungeonEvents: DungeonEvent[];
}

export type AppAction =
  | { type: 'TOGGLE_SIMULATION' }
  | { type: 'SET_IS_SIMULATION_RUNNING'; payload: boolean }
  | { type: 'SET_SIMULATION_SPEED'; payload: number }
  | { type: 'SET_CURRENT_DAY'; payload: number }
  | { type: 'SET_IS_SKIPPING'; payload: boolean }
  | { type: 'SET_SKIP_DAYS'; payload: number }
  | { type: 'SET_HISTORY_FILTER'; payload: 'all' | 'agent' | 'basin' | 'dungeon' }
  | { type: 'SET_SELECTED_HISTORY_ID'; payload: string | null }
  | { type: 'SET_FILTERED_EVENTS'; payload: string[] }
  | { type: 'SET_SAVE_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_LOAD_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SAVE_NAME'; payload: string }
  | { type: 'SET_SAVE_LIST'; payload: string[] }
  | { type: 'SET_SELECTED_SAVE'; payload: string | null }
  | { type: 'SET_IMPORT_FILE'; payload: File | null }
  | { type: 'SET_SHOW_CONFIRMATION'; payload: boolean }
  | { type: 'SET_CONFIRMATION_ACTION'; payload: (() => void) | null }
  | { type: 'SET_CONFIRMATION_MESSAGE'; payload: string }
  | { type: 'SET_SHOW_TOOLTIP'; payload: string | null }
  | { type: 'SET_TOOLTIP_POSITION'; payload: { x: number; y: number } }
  | { type: 'SET_SHOW_HELP'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_NEW_EVENT_HIGHLIGHT'; payload: boolean }
  | { type: 'SET_PREFERENCES'; payload: AppState['preferences'] }
  | { type: 'SET_MAZE_SEED'; payload: string }
  | { type: 'SET_MAZE_WIDTH'; payload: number }
  | { type: 'SET_MAZE_HEIGHT'; payload: number }
  | { type: 'SET_BASIN_COUNT'; payload: number }
  | { type: 'SET_POPULATION_PER_BASIN'; payload: number }
  | { type: 'SET_INITIAL_CASUALTY_RATE'; payload: number }
  | { type: 'SET_GRID'; payload: Cell[][] }
  | { type: 'SET_BASINS'; payload: Basin[] }
  | { type: 'SET_DUNGEONS'; payload: Dungeon[] }
  | { type: 'SET_AGENTS'; payload: Agent[] }
  | { type: 'SET_SELECTED_AGENT'; payload: Agent | null }
  | { type: 'SET_SELECTED_DUNGEON'; payload: Dungeon | null }
  | { type: 'SET_SELECTED_CELL'; payload: Cell | null } // Added selectedCell action
  | { type: 'SET_NOTABLE_AGENTS'; payload: Agent[] }
  | { type: 'SET_EVENTS'; payload: string[] }
  | { type: 'SET_DUNGEON_EVENTS'; payload: DungeonEvent[] };

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'TOGGLE_SIMULATION':
      return { ...state, isSimulationRunning: !state.isSimulationRunning };
    case 'SET_SIMULATION_SPEED':
      return { ...state, simulationSpeed: action.payload };
    case 'SET_CURRENT_DAY':
      return { ...state, currentDay: action.payload };
    case 'SET_IS_SKIPPING':
      return { ...state, isSkipping: action.payload };
    case 'SET_SKIP_DAYS':
      return { ...state, skipDays: action.payload };
    case 'SET_HISTORY_FILTER':
      return { ...state, historyFilter: action.payload };
    case 'SET_SELECTED_HISTORY_ID':
      return { ...state, selectedHistoryId: action.payload };
    case 'SET_FILTERED_EVENTS':
      return { ...state, filteredEvents: action.payload };
    case 'SET_SAVE_MODAL_OPEN':
      return { ...state, saveModalOpen: action.payload };
    case 'SET_LOAD_MODAL_OPEN':
      return { ...state, loadModalOpen: action.payload };
    case 'SET_SAVE_NAME':
      return { ...state, saveName: action.payload };
    case 'SET_SAVE_LIST':
      return { ...state, saveList: action.payload };
    case 'SET_SELECTED_SAVE':
      return { ...state, selectedSave: action.payload };
    case 'SET_IMPORT_FILE':
      return { ...state, importFile: action.payload };
    case 'SET_SHOW_CONFIRMATION':
      return { ...state, showConfirmation: action.payload };
    case 'SET_CONFIRMATION_ACTION':
      return { ...state, confirmationAction: action.payload };
    case 'SET_CONFIRMATION_MESSAGE':
      return { ...state, confirmationMessage: action.payload };
    case 'SET_SHOW_TOOLTIP':
      return { ...state, showTooltip: action.payload };
    case 'SET_TOOLTIP_POSITION':
      return { ...state, tooltipPosition: action.payload };
    case 'SET_SHOW_HELP':
      return { ...state, showHelp: action.payload };
    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };
    case 'SET_NEW_EVENT_HIGHLIGHT':
      return { ...state, newEventHighlight: action.payload };
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    case 'SET_MAZE_SEED':
      return { ...state, mazeSeed: action.payload };
    case 'SET_MAZE_WIDTH':
      return { ...state, mazeWidth: action.payload };
    case 'SET_MAZE_HEIGHT':
      return { ...state, mazeHeight: action.payload };
    case 'SET_BASIN_COUNT':
      return { ...state, basinCount: action.payload };
    case 'SET_POPULATION_PER_BASIN':
      return { ...state, populationPerBasin: action.payload };
    case 'SET_INITIAL_CASUALTY_RATE':
      return { ...state, initialCasualtyRate: action.payload };
    case 'SET_GRID':
      return { ...state, grid: action.payload };
    case 'SET_BASINS':
      return { ...state, basins: action.payload };
    case 'SET_DUNGEONS':
      return { ...state, dungeons: action.payload };
    case 'SET_AGENTS':
      return { ...state, agents: action.payload };
    case 'SET_SELECTED_AGENT':
      return { ...state, selectedAgent: action.payload };
    case 'SET_SELECTED_DUNGEON':
      return { ...state, selectedDungeon: action.payload };
    case 'SET_SELECTED_CELL': // Added SET_SELECTED_CELL case
      return { ...state, selectedCell: action.payload };
    case 'SET_NOTABLE_AGENTS':
      return { ...state, notableAgents: action.payload };
    case 'SET_EVENTS':
      return { ...state, events: action.payload };
    case 'SET_DUNGEON_EVENTS':
      return { ...state, dungeonEvents: action.payload };
    default:
      return state;
  }
};