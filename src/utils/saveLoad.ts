// Save/Load functionality for the MOG-Simulator

import { Cell } from '../models/Cell';
import { Basin } from '../models/Basin';
import { Dungeon } from '../models/Dungeon';
import type { DungeonEvent } from '../models/Dungeon';
import { Agent } from '../models/Agent';
import type { Birthright, Augment, CellType, IAgent } from '../models/types';

// Define the save data structure
export interface SaveData {
  version: string;
  timestamp: number;
  seed: string;
  currentDay: number;
  mazeWidth: number;
  mazeHeight: number;
  grid: SerializedCell[][];
  basins: SerializedBasin[];
  dungeons: SerializedDungeon[];
  agents: SerializedAgent[];
  events: string[];
}

// Serialized versions of models for saving
interface SerializedCell {
  id: string;
  type: string;
  position: { x: number; y: number };
  resources: { food: number; water: number };
  basinId?: string;
  dungeonId?: string;
}

interface SerializedBasin {
  id: string;
  name: string;
  location: { x: number; y: number };
  agentIds: string[];
}

interface SerializedDungeon {
  id: string;
  name: string;
  location: { x: number; y: number };
  difficulty: number;
  augmentReward: Augment;
  challengesCompleted: number;
  history: DungeonEvent[];
}

interface SerializedAgent {
  id: string;
  name: string;
  status: string;
  location: { x: number; y: number };
  basinOrigin: string;
  stats: {
    health: number;
    hunger: number;
    thirst: number;
    energy: number;
    morale: number;
  };
  birthright: Birthright;
  augment: Augment | null;
  knownMap: string[];
  relationships: Record<string, number>;
  history: string[];
  achievements: {
    id: string;
    name: string;
    description: string;
    day: number;
    importance: number;
  }[];
  isNotable: boolean;
  daysSurvived: number;
}

/**
 * Save the current simulation state
 * @param state Current simulation state
 * @returns Save data object
 */
export function saveSimulation(state: {
  seed: string;
  currentDay: number;
  mazeWidth: number;
  mazeHeight: number;
  grid: Cell[][];
  basins: Basin[];
  dungeons: Dungeon[];
  agents: Agent[];
  events: string[];
}): SaveData {
  const { seed, currentDay, mazeWidth, mazeHeight, grid, basins, dungeons, agents, events } = state;
  
  // Create save data
  const saveData: SaveData = {
    version: '1.0.0',
    timestamp: Date.now(),
    seed,
    currentDay,
    mazeWidth,
    mazeHeight,
    grid: serializeGrid(grid),
    basins: serializeBasins(basins),
    dungeons: serializeDungeons(dungeons),
    agents: serializeAgents(agents),
    events
  };
  
  return saveData;
}

/**
 * Load a saved simulation state
 * @param saveData Save data to load
 * @returns Reconstructed simulation state
 */
export function loadSimulation(saveData: SaveData): {
  seed: string;
  currentDay: number;
  mazeWidth: number;
  mazeHeight: number;
  grid: Cell[][];
  basins: Basin[];
  dungeons: Dungeon[];
  agents: Agent[];
  events: string[];
} {
  const { seed, currentDay, mazeWidth, mazeHeight, grid: serializedGrid, 
    basins: serializedBasins, dungeons: serializedDungeons, 
    agents: serializedAgents, events } = saveData;
  
  // Reconstruct grid, basins, dungeons, and agents
  const grid = deserializeGrid(serializedGrid);
  const basins = deserializeBasins(serializedBasins);
  const dungeons = deserializeDungeons(serializedDungeons);
  const agents = deserializeAgents(serializedAgents);
  
  // Reconnect references
  reconnectReferences(grid, basins, dungeons, agents);
  
  return {
    seed,
    currentDay,
    mazeWidth,
    mazeHeight,
    grid,
    basins,
    dungeons,
    agents,
    events
  };
}

/**
 * Save simulation state to local storage
 * @param name Save name
 * @param saveData Save data
 */
export function saveToLocalStorage(name: string, saveData: SaveData): void {
  try {
    const saveKey = `mog-simulator-save-${name}`;
    localStorage.setItem(saveKey, JSON.stringify(saveData));
    
    // Update save list
    const saveList = getSaveList();
    if (!saveList.includes(name)) {
      saveList.push(name);
      localStorage.setItem('mog-simulator-saves', JSON.stringify(saveList));
    }
  } catch (error) {
    console.error('Failed to save to local storage:', error);
  }
}

/**
 * Load simulation state from local storage
 * @param name Save name
 * @returns Save data or null if not found
 */
export function loadFromLocalStorage(name: string): SaveData | null {
  try {
    const saveKey = `mog-simulator-save-${name}`;
    const saveData = localStorage.getItem(saveKey);
    
    if (saveData) {
      return JSON.parse(saveData) as SaveData;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load from local storage:', error);
    return null;
  }
}

/**
 * Get list of available saves
 * @returns List of save names
 */
export function getSaveList(): string[] {
  try {
    const saveList = localStorage.getItem('mog-simulator-saves');
    
    if (saveList) {
      return JSON.parse(saveList) as string[];
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get save list:', error);
    return [];
  }
}

/**
 * Delete a save from local storage
 * @param name Save name
 */
export function deleteSave(name: string): void {
  try {
    const saveKey = `mog-simulator-save-${name}`;
    localStorage.removeItem(saveKey);
    
    // Update save list
    const saveList = getSaveList().filter(saveName => saveName !== name);
    localStorage.setItem('mog-simulator-saves', JSON.stringify(saveList));
  } catch (error) {
    console.error('Failed to delete save:', error);
  }
}

/**
 * Export save data to a file
 * @param saveData Save data
 * @param fileName File name
 */
export function exportToFile(saveData: SaveData, fileName: string): void {
  try {
    const dataStr = JSON.stringify(saveData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = fileName || `mog-simulator-save-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  } catch (error) {
    console.error('Failed to export save:', error);
  }
}

/**
 * Import save data from a file
 * @param file File to import
 * @returns Promise that resolves to save data
 */
export function importFromFile(file: File): Promise<SaveData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const saveData = JSON.parse(event.target?.result as string) as SaveData;
        resolve(saveData);
      } catch {
        reject(new Error('Invalid save file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Helper functions for serialization and deserialization

function serializeGrid(grid: Cell[][]): SerializedCell[][] {
  return grid.map(row => 
    row.map(cell => ({
      id: cell.id,
      type: cell.type,
      position: { ...cell.position },
      resources: { ...cell.resources },
      basinId: cell.basinId,
      dungeonId: cell.dungeonId
    }))
  );
}

function serializeBasins(basins: Basin[]): SerializedBasin[] {
  return basins.map(basin => ({
    id: basin.id,
    name: basin.name,
    location: { ...basin.location },
    agentIds: basin.population.map((agent: IAgent) => agent.id)
  }));
}

function serializeDungeons(dungeons: Dungeon[]): SerializedDungeon[] {
  return dungeons.map(dungeon => ({
    id: dungeon.id,
    name: dungeon.name,
    location: { ...dungeon.location },
    difficulty: dungeon.difficulty,
    augmentReward: { ...dungeon.augmentReward },
    challengesCompleted: dungeon.challengesCompleted,
    history: [...dungeon.history]
  }));
}

function serializeAgents(agents: Agent[]): SerializedAgent[] {
  return agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    location: { ...agent.location },
    basinOrigin: agent.basinOrigin,
    stats: { ...agent.stats },
    birthright: { ...agent.birthright },
    augment: agent.augment ? { ...agent.augment } : null,
    knownMap: Array.from(agent.knownMap),
    relationships: { ...agent.relationships },
    history: [...agent.history],
    achievements: agent.achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      day: achievement.day,
      importance: achievement.importance
    })),
    isNotable: agent.isNotable,
    daysSurvived: agent.daysSurvived
  }));
}

function deserializeGrid(serializedGrid: SerializedCell[][]): Cell[][] {
  return serializedGrid.map(row => 
    row.map(cell => {
      const newCell = new Cell(
        cell.position.x,
        cell.position.y,
        cell.type as CellType
      );
      
      newCell.resources = { ...cell.resources };
      newCell.basinId = cell.basinId;
      newCell.dungeonId = cell.dungeonId;
      
      return newCell;
    })
  );
}

function deserializeBasins(serializedBasins: SerializedBasin[]): Basin[] {
  return serializedBasins.map(basin => {
    const newBasin = new Basin(
      basin.id,
      basin.name,
      basin.location,
      5 // Default radius
    );
    
    return newBasin;
  });
}

function deserializeDungeons(serializedDungeons: SerializedDungeon[]): Dungeon[] {
  return serializedDungeons.map(dungeon => {
    const newDungeon = new Dungeon(
      dungeon.id,
      dungeon.name,
      dungeon.location,
      dungeon.difficulty,
      dungeon.augmentReward
    );
    
    newDungeon.challengesCompleted = dungeon.challengesCompleted;
    newDungeon.history = [...dungeon.history];
    
    return newDungeon;
  });
}

function deserializeAgents(serializedAgents: SerializedAgent[]): Agent[] {
  return serializedAgents.map(agent => {
    const newAgent = new Agent(
      agent.id,
      agent.name,
      agent.location,
      agent.basinOrigin,
      agent.birthright
    );
    
    newAgent.status = agent.status as 'alive' | 'injured' | 'dead';
    newAgent.stats = { ...agent.stats };
    newAgent.augment = agent.augment ? { ...agent.augment } : null;
    newAgent.knownMap = new Set(agent.knownMap);
    newAgent.relationships = { ...agent.relationships };
    newAgent.history = [...agent.history];
    newAgent.achievements = agent.achievements.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      day: achievement.day,
      importance: achievement.importance
    }));
    newAgent.isNotable = agent.isNotable;
    newAgent.daysSurvived = agent.daysSurvived;
    
    return newAgent;
  });
}

function reconnectReferences(
  grid: Cell[][],
  basins: Basin[],
  dungeons: Dungeon[],
  agents: Agent[]
): void {
  // Connect cells to dungeons and basins
  grid.forEach(row => {
    row.forEach(cell => {
      if (cell.dungeonId) {
        const dungeon = dungeons.find(d => d.id === cell.dungeonId);
        if (dungeon) {
          dungeon.setCell(cell);
        }
      }
      
      if (cell.basinId) {
        const basin = basins.find(b => b.id === cell.basinId);
        if (basin) {
          basin.addCell(cell);
        }
      }
    });
  });
  
  // Connect agents to basins
  basins.forEach(basin => {
    const basinAgents = agents.filter(agent => agent.basinOrigin === basin.id);
    basinAgents.forEach(agent => {
      basin.addAgent(agent);
    });
  });
}