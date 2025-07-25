import seedrandom from 'seedrandom';
import { Cell } from '../models/Cell';
import { Basin } from '../models/Basin';
import { Dungeon } from '../models/Dungeon';
import type { Position, Augment } from '../models/types';

/**
 * Generate a random name for a basin
 * @returns Random basin name
 */
function generateBasinName(): string {
  const prefixes = [
    'North', 'South', 'East', 'West', 'Hidden', 'Lost', 'Ancient', 'Forgotten',
    'Mystic', 'Sacred', 'Cursed', 'Blessed', 'Shadowed', 'Sunlit', 'Moonlit'
  ];
  
  const suffixes = [
    'Haven', 'Refuge', 'Sanctuary', 'Enclave', 'Settlement', 'Camp', 'Outpost',
    'Colony', 'Bastion', 'Stronghold', 'Hideout', 'Shelter', 'Hollow', 'Glen'
  ];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${suffix}`;
}

/**
 * Generate a random name for a dungeon
 * @returns Random dungeon name
 */
function generateDungeonName(): string {
  const prefixes = [
    'Abyssal', 'Infernal', 'Celestial', 'Arcane', 'Forbidden', 'Corrupted',
    'Haunted', 'Twisted', 'Shattered', 'Forsaken', 'Eternal', 'Primal', 'Void'
  ];
  
  const suffixes = [
    'Tower', 'Spire', 'Pillar', 'Monolith', 'Obelisk', 'Citadel', 'Bastion',
    'Sanctum', 'Temple', 'Shrine', 'Vault', 'Chamber', 'Nexus', 'Gateway'
  ];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix} ${suffix}`;
}

/**
 * Generate a random augment
 * @returns Random augment
 */
function generateAugment(): Augment {
  const augments: Augment[] = [
    {
      id: 'augment-1',
      name: 'Sand Sovereign',
      description: 'Immune to the first lethal attack in any conflict',
      effects: [
        {
          type: 'combat',
          value: 100,
          description: 'Survive first lethal attack'
        }
      ],
      rarity: 'legendary'
    },
    {
      id: 'augment-2',
      name: 'Night Piercing Gaze',
      description: 'Can see in complete darkness and through walls',
      effects: [
        {
          type: 'vision',
          value: 100,
          description: 'See in darkness and through walls'
        }
      ],
      rarity: 'rare'
    },
    {
      id: 'augment-3',
      name: 'Verdant Touch',
      description: 'Can create food from any organic material',
      effects: [
        {
          type: 'survival',
          value: 50,
          description: 'Create food from organic material'
        }
      ],
      rarity: 'uncommon'
    },
    {
      id: 'augment-4',
      name: 'Aqua Nexus',
      description: 'Can locate and purify water sources',
      effects: [
        {
          type: 'survival',
          value: 50,
          description: 'Locate and purify water'
        }
      ],
      rarity: 'uncommon'
    },
    {
      id: 'augment-5',
      name: 'Stone Skin',
      description: 'Skin hardens like stone, reducing damage',
      effects: [
        {
          type: 'defense',
          value: 50,
          description: 'Reduce physical damage'
        }
      ],
      rarity: 'rare'
    }
  ];
  
  return augments[Math.floor(Math.random() * augments.length)];
}

/**
 * Check if a position is within the grid bounds
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Grid width
 * @param height Grid height
 * @returns Whether the position is within bounds
 */
function isInBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

/**
 * Initialize a grid with all walls
 * @param width Width of the grid
 * @param height Height of the grid
 * @returns 2D array of cells
 */
function initializeGrid(width: number, height: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < width; x++) {
      row.push(new Cell(x, y, 'wall'));
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Add neighboring walls to the wall list
 * @param x X coordinate of the cell
 * @param y Y coordinate of the cell
 * @param grid The maze grid
 * @param walls The list of walls
 * @param width Grid width
 * @param height Grid height
 */
function addWallsToList(
  x: number,
  y: number,
  grid: Cell[][],
  walls: Position[],
  width: number,
  height: number
): void {
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    if (isInBounds(nx, ny, width, height) && grid[ny][nx].type === 'wall') {
      // Check if the wall is not already in the list
      if (!walls.some(wall => wall.x === nx && wall.y === ny)) {
        walls.push({ x: nx, y: ny });
      }
    }
  }
}

/**
 * Check if a wall is valid to remove
 * @param x X coordinate of the wall
 * @param y Y coordinate of the wall
 * @param grid The maze grid
 * @param width Grid width
 * @param height Grid height
 * @returns Whether the wall is valid to remove
 */
function isValidWallToRemove(x: number, y: number, grid: Cell[][], width: number, height: number): boolean {
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];

  let pathCount = 0;

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    if (isInBounds(nx, ny, width, height) && grid[ny][nx].type === 'path') {
      pathCount++;
    }
  }

  // If exactly one of the cells that the wall divides is a path
  return pathCount === 1;
}

/**
 * Get neighboring positions
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Grid width
 * @param height Grid height
 * @returns Array of neighboring positions
 */
function getNeighbors(x: number, y: number, width: number, height: number): Position[] {
  const neighbors: Position[] = [];
  
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];
  
  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (isInBounds(nx, ny, width, height)) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  
  return neighbors;
}

/**
 * Generate a maze using Randomized Prim's Algorithm
 * @param width Maze width
 * @param height Maze height
 * @param seed Random seed
 * @returns 2D array of cells
 */
export function generateMaze(width: number, height: number, seed?: string): Cell[][] {
  // Initialize random number generator with seed
  const random = seed ? seedrandom(seed) : seedrandom();

  // Initialize grid with all walls
  const grid: Cell[][] = initializeGrid(width, height);

  // Start with a random cell
  const startX = Math.floor(random() * Math.floor((width - 1) / 2)) * 2 + 1;
  const startY = Math.floor(random() * Math.floor((height - 1) / 2)) * 2 + 1;
  grid[startY][startX].type = 'path';

  // Add walls of the starting cell to the wall list
  const walls: Position[] = [];
  addWallsToList(startX, startY, grid, walls, width, height);

  // While there are walls in the list
  while (walls.length > 0) {
    // Pick a random wall from the list
    const wallIndex = Math.floor(random() * walls.length);
    const wall = walls[wallIndex];

    // Remove the wall from the list
    walls.splice(wallIndex, 1);

    const x = wall.x;
    const y = wall.y;

    // If only one of the two cells that the wall divides is a path
    if (isValidWallToRemove(x, y, grid, width, height)) {
      // Make the wall a path
      grid[y][x].type = 'path';

      // Add the neighboring walls to the wall list
      addWallsToList(x, y, grid, walls, width, height);
    }
  }

  // Ensure connectivity
  ensureConnectivity(grid);

  return grid;
}

/**
 * Ensure that the maze is fully connected
 * @param grid Maze grid
 */
function ensureConnectivity(grid: Cell[][]): void {
  const height = grid.length;
  const width = grid[0].length;
  
  // Find all path cells
  const pathCells: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].type === 'path') {
        pathCells.push({ x, y });
      }
    }
  }
  
  // If no path cells, return
  if (pathCells.length === 0) return;
  
  // Use flood fill to find connected regions
  const visited = new Set<string>();
  const regions: Position[][] = [];
  
  for (const cell of pathCells) {
    const cellId = `${cell.x}-${cell.y}`;
    
    if (!visited.has(cellId)) {
      const region: Position[] = [];
      floodFill(cell.x, cell.y, grid, visited, region);
      regions.push(region);
    }
  }
  
  // If only one region, the maze is already connected
  if (regions.length <= 1) return;
  
  // Connect disconnected regions
  for (let i = 1; i < regions.length; i++) {
    const region = regions[i];
    const mainRegion = regions[0];
    
    // Find the closest pair of cells between the regions
    let minDistance = Infinity;
    let connection: { from: Position, to: Position } | null = null;
    
    for (const cell1 of region) {
      for (const cell2 of mainRegion) {
        const distance = Math.abs(cell1.x - cell2.x) + Math.abs(cell1.y - cell2.y);
        
        if (distance < minDistance) {
          minDistance = distance;
          connection = { from: cell1, to: cell2 };
        }
      }
    }
    
    // Create a path between the regions
    if (connection) {
      createPathBetween(connection.from, connection.to, grid);
    }
  }
}

/**
 * Flood fill algorithm to find connected regions
 * @param x X coordinate
 * @param y Y coordinate
 * @param grid Maze grid
 * @param visited Set of visited cell IDs
 * @param region Array to store the region cells
 */
function floodFill(
  x: number,
  y: number,
  grid: Cell[][],
  visited: Set<string>,
  region: Position[]
): void {
  const height = grid.length;
  const width = grid[0].length;
  
  const cellId = `${x}-${y}`;
  
  if (visited.has(cellId)) return;
  if (!isInBounds(x, y, width, height)) return;
  if (grid[y][x].type !== 'path') return;
  
  visited.add(cellId);
  region.push({ x, y });
  
  // Visit neighbors
  const neighbors = getNeighbors(x, y, width, height);
  for (const neighbor of neighbors) {
    floodFill(neighbor.x, neighbor.y, grid, visited, region);
  }
}

/**
 * Create a path between two cells
 * @param from Starting cell
 * @param to Ending cell
 * @param grid Maze grid
 */
function createPathBetween(from: Position, to: Position, grid: Cell[][]): void {
  // Create a path in a straight line first in x direction, then in y direction
  const dx = to.x > from.x ? 1 : (to.x < from.x ? -1 : 0);
  const dy = to.y > from.y ? 1 : (to.y < from.y ? -1 : 0);
  
  let x = from.x;
  let y = from.y;
  
  // Move in x direction
  while (x !== to.x) {
    x += dx;
    grid[y][x].type = 'path';
  }
  
  // Move in y direction
  while (y !== to.y) {
    y += dy;
    grid[y][x].type = 'path';
  }
}

/**
 * Place basins in the maze
 * @param grid Maze grid
 * @param basinCount Number of basins to place
 * @param random Random function
 * @returns Array of placed basins
 */
export function placeBasins(
  grid: Cell[][],
  basinCount: number,
  random: seedrandom.PRNG
): Basin[] {
  const height = grid.length;
  const width = grid[0].length;
  
  // Find all path cells
  const pathCells: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].type === 'path') {
        pathCells.push({ x, y });
      }
    }
  }
  
  // If not enough path cells, return empty array
  if (pathCells.length < basinCount) return [];
  
  // Minimum distance between basins
  const minDistance = Math.floor(Math.min(width, height) / 4);
  
  // Place basins
  const basins: Basin[] = [];
  
  for (let i = 0; i < basinCount; i++) {
    let attempts = 0;
    let placed = false;
    
    while (!placed && attempts < 100) {
      // Pick a random path cell
      const index = Math.floor(random() * pathCells.length);
      const cell = pathCells[index];
      
      // Check if it's far enough from other basins
      let tooClose = false;
      for (const basin of basins) {
        const distance = Math.abs(cell.x - basin.location.x) + Math.abs(cell.y - basin.location.y);
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        // Create the basin
        const basinId = `basin-${i}`;
        const basinName = generateBasinName();
        const radius = 2 + Math.floor(random() * 2); // Basin radius 2-3
        
        const basin = new Basin(basinId, basinName, cell, radius);

        // Expand the basin
        expandBasin(cell.x, cell.y, grid, basin, radius);

        basins.push(basin);
        placed = true;
      }
      
      attempts++;
    }
  }
  
  return basins;
}

/**
 * Expand a basin to create a larger area
 * @param x X coordinate of the basin center
 * @param y Y coordinate of the basin center
 * @param grid Maze grid
 * @param basin Basin to expand
 * @param radius Radius of the basin
 */
function expandBasin(
  x: number,
  y: number,
  grid: Cell[][],
  basin: Basin,
  radius: number
): void {
  const height = grid.length;
  const width = grid[0].length;
  
  // Convert surrounding cells to basin type
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      // Check if in bounds and not a wall
      if (isInBounds(nx, ny, width, height) && grid[ny][nx].type !== 'wall') {
        // Calculate distance from center
        const distance = Math.abs(dx) + Math.abs(dy);
        
        // Convert to basin if within radius
        if (distance <= radius) {
          grid[ny][nx].convertToBasin(basin.id);
        }
      }
    }
  }
  
  // Ensure basin has at least one exit path
  ensureBasinExit(x, y, grid, radius);
}

/**
 * Ensure that a basin has at least one exit path
 * @param x X coordinate of the basin center
 * @param y Y coordinate of the basin center
 * @param grid Maze grid
 * @param radius Radius of the basin
 */
function ensureBasinExit(
  x: number,
  y: number,
  grid: Cell[][],
  radius: number
): void {
  const height = grid.length;
  const width = grid[0].length;
  
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];
  
  // Check each direction from the edge of the basin
  for (const dir of directions) {
    const nx = x + dir.dx * (radius + 1);
    const ny = y + dir.dy * (radius + 1);
    
    // If in bounds and a wall, convert to path
    if (isInBounds(nx, ny, width, height) && grid[ny][nx].type === 'wall') {
      grid[ny][nx].type = 'path';
      return; // One exit is enough
    }
  }
}

/**
 * Place dungeons in the maze
 * @param grid Maze grid
 * @param dungeonCount Number of dungeons to place
 * @param basins Array of basins to avoid
 * @param random Random function
 * @returns Array of placed dungeons
 */
export function placeDungeons(
  grid: Cell[][],
  dungeonCount: number,
  basins: Basin[],
  random: seedrandom.PRNG
): Dungeon[] {
  const height = grid.length;
  const width = grid[0].length;
  
  // Find all path cells that are not near basins
  const pathCells: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].type === 'path') {
        // Check if it's far from any basin
        let nearBasin = false;
        const checkRadius = 5; // Minimum distance from basins
        
        for (const basin of basins) {
          const distance = Math.abs(x - basin.location.x) + Math.abs(y - basin.location.y);
          if (distance < checkRadius) {
            nearBasin = true;
            break;
          }
        }
        
        if (!nearBasin) {
          pathCells.push({ x, y });
        }
      }
    }
  }
  
  // If not enough path cells, return empty array
  if (pathCells.length < dungeonCount) return [];
  
  // Minimum distance between dungeons
  const minDistance = Math.floor(Math.min(width, height) / 5);
  
  // Place dungeons
  const dungeons: Dungeon[] = [];
  
  for (let i = 0; i < dungeonCount; i++) {
    let attempts = 0;
    let placed = false;
    
    while (!placed && attempts < 100) {
      // Pick a random path cell
      const index = Math.floor(random() * pathCells.length);
      const cell = pathCells[index];
      
      // Check if it's far enough from other dungeons
      let tooClose = false;
      for (const dungeon of dungeons) {
        const distance = Math.abs(cell.x - dungeon.location.x) + Math.abs(cell.y - dungeon.location.y);
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        // Create the dungeon
        const dungeonId = `dungeon-${i}`;
        const dungeonName = generateDungeonName();
        const difficulty = 1 + Math.floor(random() * 10); // Difficulty 1-10
        const augment = generateAugment();
        
        const dungeon = new Dungeon(dungeonId, dungeonName, cell, difficulty, augment);

        // Convert cell to dungeon type
        grid[cell.y][cell.x].convertToDungeon(dungeon.id);

        // Ensure dungeon has exactly one entrance
        ensureDungeonEntrance(cell.x, cell.y, grid);

        dungeons.push(dungeon);
        placed = true;
      }
      
      attempts++;
    }
  }
  
  return dungeons;
}

/**
 * Ensure that a dungeon has exactly one entrance
 * @param x X coordinate of the dungeon
 * @param y Y coordinate of the dungeon
 * @param grid Maze grid
 */
function ensureDungeonEntrance(x: number, y: number, grid: Cell[][]): void {
  const height = grid.length;
  const width = grid[0].length;
  
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];
  
  // Count existing path entrances
  let entrances = 0;
  const entranceDirections: { dx: number, dy: number }[] = [];
  
  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (isInBounds(nx, ny, width, height) && grid[ny][nx].type === 'path') {
      entrances++;
      entranceDirections.push(dir);
    }
  }
  
  // If no entrances, create one
  if (entrances === 0) {
    // Pick a random direction
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (isInBounds(nx, ny, width, height)) {
      grid[ny][nx].type = 'path';
    }
  }
  // If more than one entrance, block all but one
  else if (entrances > 1) {
    // Keep only the first entrance
    for (let i = 1; i < entranceDirections.length; i++) {
      const dir = entranceDirections[i];
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      
      grid[ny][nx].type = 'wall';
    }
  }
}

/**
 * Distribute resources throughout the maze
 * @param grid Maze grid
 * @param basins Array of basins
 * @param random Random function
 */
export function distributeResources(
  grid: Cell[][],
  basins: Basin[],
  random: seedrandom.PRNG
): void {
  const height = grid.length;
  const width = grid[0].length;

  // Assign high resources to basin cells
  for (const basin of basins) {
    for (const cell of basin.cells) {
      cell.addResources(50 + Math.floor(random() * 50), 70 + Math.floor(random() * 30));
    }
  }

  // Create resource gradients from basins
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];

      // Skip walls and basin cells (already have resources)
      if (cell.type === 'wall' || cell.type === 'basin') {
        continue;
      }

      // Calculate distance to nearest basin
      let minDistance = Infinity;
      for (const basin of basins) {
        const distance = Math.abs(x - basin.location.x) + Math.abs(y - basin.location.y);
        minDistance = Math.min(minDistance, distance);
      }

      // Add resources based on distance (closer = more)
      const distanceFactor = Math.max(0, 1 - (minDistance / 20)); // 0 to 1
      const foodAmount = Math.floor(random() * 10 * distanceFactor);
      const waterAmount = Math.floor(random() * 15 * distanceFactor);

      cell.addResources(foodAmount, waterAmount);
    }
  }

  // Add random resource hotspots
  const hotspotCount = Math.floor(width * height / 100); // 1 hotspot per 100 cells

  for (let i = 0; i < hotspotCount; i++) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);

    if (grid[y][x].type !== 'wall') {
      const foodAmount = 10 + Math.floor(random() * 20); // 10-29
      const waterAmount = 15 + Math.floor(random() * 25); // 15-39

      grid[y][x].addResources(foodAmount, waterAmount);
    }
  }
}

/**
 * Generate a complete maze with basins, dungeons, and resources
 * @param width Maze width
 * @param height Maze height
 * @param basinCount Number of basins
 * @param dungeonCount Number of dungeons
 * @param seed Random seed
 * @returns Object containing the grid, basins, and dungeons
 */
export function generateCompleteMaze(
  width: number,
  height: number,
  basinCount: number,
  dungeonCount: number,
  seed?: string
): {
  grid: Cell[][],
  basins: Basin[],
  dungeons: Dungeon[]
} {
  // Initialize random number generator with seed
  const random = seed ? seedrandom(seed) : seedrandom();
  
  // Generate the maze
  const grid = generateMaze(width, height, seed);
  
  // Place basins
  const basins = placeBasins(grid, basinCount, random);
  
  // Place dungeons
  const dungeons = placeDungeons(grid, dungeonCount, basins, random);
  
  // Distribute resources
  distributeResources(grid, basins, random);
  
  return { grid, basins, dungeons };
}