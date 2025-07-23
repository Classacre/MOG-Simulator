# Maze Generation Sample Implementation

This document provides a sample implementation of the maze generation algorithm using Randomized Prim's Algorithm with connectivity validation.

## Core Algorithm Implementation

```javascript
/**
 * Maze generation using Randomized Prim's Algorithm
 * @param {number} width - Width of the maze
 * @param {number} height - Height of the maze
 * @param {string} seed - Seed for random number generation
 * @returns {Cell[][]} - 2D array of cells representing the maze
 */
export function generateMaze(width, height, seed) {
  // Initialize the random number generator with the seed
  const random = new seedrandom(seed);
  
  // Initialize the grid with all walls
  const grid = initializeGrid(width, height);
  
  // Start with a random cell
  const startX = Math.floor(random() * Math.floor(width / 2)) * 2 + 1;
  const startY = Math.floor(random() * Math.floor(height / 2)) * 2 + 1;
  grid[startY][startX].type = 'path';
  
  // Add walls of the starting cell to the wall list
  const walls = [];
  addWallsToList(startX, startY, grid, walls);
  
  // While there are walls in the list
  while (walls.length > 0) {
    // Pick a random wall from the list
    const wallIndex = Math.floor(random() * walls.length);
    const wall = walls[wallIndex];
    
    // Remove the wall from the list
    walls.splice(wallIndex, 1);
    
    // If only one of the two cells that the wall divides is a path
    const x = wall.x;
    const y = wall.y;
    
    if (isValidWallToRemove(x, y, grid)) {
      // Make the wall a path
      grid[y][x].type = 'path';
      
      // Add the neighboring walls to the wall list
      addWallsToList(x, y, grid, walls);
    }
  }
  
  // Validate and fix connectivity
  ensureConnectivity(grid, random);
  
  // Place basins and dungeons
  placeBasins(grid, random);
  placeDungeons(grid, random);
  
  // Distribute resources
  distributeResources(grid, random);
  
  return grid;
}

/**
 * Initialize a grid with all walls
 * @param {number} width - Width of the grid
 * @param {number} height - Height of the grid
 * @returns {Cell[][]} - 2D array of cells
 */
function initializeGrid(width, height) {
  const grid = [];
  
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({
        id: `${x}-${y}`,
        type: 'wall',
        position: { x, y },
        resources: { food: 0, water: 0 },
        occupants: [],
        discovered: false
      });
    }
    grid.push(row);
  }
  
  return grid;
}

/**
 * Add neighboring walls to the wall list
 * @param {number} x - X coordinate of the cell
 * @param {number} y - Y coordinate of the cell
 * @param {Cell[][]} grid - The maze grid
 * @param {Object[]} walls - The list of walls
 */
function addWallsToList(x, y, grid, walls) {
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];
  
  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (isInBounds(nx, ny, grid) && grid[ny][nx].type === 'wall') {
      // Check if the wall is not already in the list
      if (!walls.some(wall => wall.x === nx && wall.y === ny)) {
        walls.push({ x: nx, y: ny });
      }
    }
  }
}

/**
 * Check if a wall is valid to remove
 * @param {number} x - X coordinate of the wall
 * @param {number} y - Y coordinate of the wall
 * @param {Cell[][]} grid - The maze grid
 * @returns {boolean} - Whether the wall is valid to remove
 */
function isValidWallToRemove(x, y, grid) {
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
    
    if (isInBounds(nx, ny, grid) && grid[ny][nx].type === 'path') {
      pathCount++;
    }
  }
  
  // If exactly one of the cells that the wall divides is a path
  return pathCount === 1;
}

/**
 * Check if coordinates are within the grid bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Cell[][]} grid - The maze grid
 * @returns {boolean} - Whether the coordinates are in bounds
 */
function isInBounds(x, y, grid) {
  return x >= 0 && y >= 0 && y < grid.length && x < grid[0].length;
}
```

## Connectivity Validation

```javascript
/**
 * Ensure that the maze is fully connected
 * @param {Cell[][]} grid - The maze grid
 * @param {Function} random - Seeded random function
 */
function ensureConnectivity(grid, random) {
  const height = grid.length;
  const width = grid[0].length;
  
  // Find all path cells
  const pathCells = [];
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
  const visited = new Set();
  const regions = [];
  
  for (const cell of pathCells) {
    const cellId = `${cell.x}-${cell.y}`;
    
    if (!visited.has(cellId)) {
      const region = [];
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
    let connection = null;
    
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
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Cell[][]} grid - The maze grid
 * @param {Set} visited - Set of visited cell IDs
 * @param {Object[]} region - Array to store the region cells
 */
function floodFill(x, y, grid, visited, region) {
  const cellId = `${x}-${y}`;
  
  if (visited.has(cellId)) return;
  if (!isInBounds(x, y, grid)) return;
  if (grid[y][x].type !== 'path') return;
  
  visited.add(cellId);
  region.push({ x, y });
  
  // Visit neighbors
  floodFill(x - 1, y, grid, visited, region);
  floodFill(x + 1, y, grid, visited, region);
  floodFill(x, y - 1, grid, visited, region);
  floodFill(x, y + 1, grid, visited, region);
}

/**
 * Create a path between two cells
 * @param {Object} from - Starting cell coordinates
 * @param {Object} to - Ending cell coordinates
 * @param {Cell[][]} grid - The maze grid
 */
function createPathBetween(from, to, grid) {
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
```

## Basin and Dungeon Placement

```javascript
/**
 * Place basins in the maze
 * @param {Cell[][]} grid - The maze grid
 * @param {Function} random - Seeded random function
 * @param {number} basinCount - Number of basins to place
 */
function placeBasins(grid, random, basinCount = 3) {
  const height = grid.length;
  const width = grid[0].length;
  
  // Find all path cells
  const pathCells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].type === 'path') {
        pathCells.push({ x, y });
      }
    }
  }
  
  // If not enough path cells, return
  if (pathCells.length < basinCount) return;
  
  // Minimum distance between basins
  const minDistance = Math.floor(Math.min(width, height) / 4);
  
  // Place basins
  const basins = [];
  
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
        const distance = Math.abs(cell.x - basin.x) + Math.abs(cell.y - basin.y);
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        // Place the basin
        grid[cell.y][cell.x].type = 'basin';
        grid[cell.y][cell.x].basinId = `basin-${i}`;
        
        // Expand the basin
        expandBasin(cell.x, cell.y, grid, random);
        
        basins.push(cell);
        placed = true;
      }
      
      attempts++;
    }
  }
}

/**
 * Expand a basin to create a larger area
 * @param {number} x - X coordinate of the basin center
 * @param {number} y - Y coordinate of the basin center
 * @param {Cell[][]} grid - The maze grid
 * @param {Function} random - Seeded random function
 */
function expandBasin(x, y, grid, random) {
  const basinId = grid[y][x].basinId;
  const radius = 2 + Math.floor(random() * 2); // Basin radius 2-3
  
  // Convert surrounding cells to basin type
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      // Check if in bounds and not a wall
      if (isInBounds(nx, ny, grid) && grid[ny][nx].type !== 'wall') {
        // Calculate distance from center
        const distance = Math.abs(dx) + Math.abs(dy);
        
        // Convert to basin if within radius
        if (distance <= radius) {
          grid[ny][nx].type = 'basin';
          grid[ny][nx].basinId = basinId;
        }
      }
    }
  }
  
  // Ensure basin has at least one exit path
  ensureBasinExit(x, y, radius, grid);
}

/**
 * Ensure that a basin has at least one exit path
 * @param {number} x - X coordinate of the basin center
 * @param {number} y - Y coordinate of the basin center
 * @param {number} radius - Radius of the basin
 * @param {Cell[][]} grid - The maze grid
 */
function ensureBasinExit(x, y, radius, grid) {
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
    if (isInBounds(nx, ny, grid) && grid[ny][nx].type === 'wall') {
      grid[ny][nx].type = 'path';
      return; // One exit is enough
    }
  }
}

/**
 * Place dungeons in the maze
 * @param {Cell[][]} grid - The maze grid
 * @param {Function} random - Seeded random function
 * @param {number} dungeonCount - Number of dungeons to place
 */
function placeDungeons(grid, random, dungeonCount = 5) {
  const height = grid.length;
  const width = grid[0].length;
  
  // Find all path cells that are not near basins
  const pathCells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].type === 'path') {
        // Check if it's far from any basin
        let nearBasin = false;
        const checkRadius = 5; // Minimum distance from basins
        
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
          for (let dx = -checkRadius; dx <= checkRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (isInBounds(nx, ny, grid) && grid[ny][nx].type === 'basin') {
              nearBasin = true;
              break;
            }
          }
          if (nearBasin) break;
        }
        
        if (!nearBasin) {
          pathCells.push({ x, y });
        }
      }
    }
  }
  
  // If not enough path cells, return
  if (pathCells.length < dungeonCount) return;
  
  // Minimum distance between dungeons
  const minDistance = Math.floor(Math.min(width, height) / 5);
  
  // Place dungeons
  const dungeons = [];
  
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
        const distance = Math.abs(cell.x - dungeon.x) + Math.abs(cell.y - dungeon.y);
        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }
      
      if (!tooClose) {
        // Place the dungeon
        grid[cell.y][cell.x].type = 'dungeon';
        grid[cell.y][cell.x].dungeonId = `dungeon-${i}`;
        
        // Ensure dungeon has exactly one entrance
        ensureDungeonEntrance(cell.x, cell.y, grid);
        
        dungeons.push(cell);
        placed = true;
      }
      
      attempts++;
    }
  }
}

/**
 * Ensure that a dungeon has exactly one entrance
 * @param {number} x - X coordinate of the dungeon
 * @param {number} y - Y coordinate of the dungeon
 * @param {Cell[][]} grid - The maze grid
 */
function ensureDungeonEntrance(x, y, grid) {
  const directions = [
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
    { dx: 0, dy: -1 }, // Up
    { dx: 0, dy: 1 }   // Down
  ];
  
  // Count existing path entrances
  let entrances = 0;
  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (isInBounds(nx, ny, grid) && grid[ny][nx].type === 'path') {
      entrances++;
    }
  }
  
  // If no entrances, create one
  if (entrances === 0) {
    // Pick a random direction
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (isInBounds(nx, ny, grid)) {
      grid[ny][nx].type = 'path';
    }
  }
  // If more than one entrance, block all but one
  else if (entrances > 1) {
    let keptOne = false;
    
    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      
      if (isInBounds(nx, ny, grid) && grid[ny][nx].type === 'path') {
        if (!keptOne) {
          keptOne = true; // Keep this entrance
        } else {
          grid[ny][nx].type = 'wall'; // Block this entrance
        }
      }
    }
  }
}
```

## Resource Distribution

```javascript
/**
 * Distribute resources throughout the maze
 * @param {Cell[][]} grid - The maze grid
 * @param {Function} random - Seeded random function
 */
function distributeResources(grid, random) {
  const height = grid.length;
  const width = grid[0].length;
  
  // Find all basin cells
  const basinCells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].type === 'basin') {
        basinCells.push({ x, y });
      }
    }
  }
  
  // Assign high resources to basin cells
  for (const cell of basinCells) {
    grid[cell.y][cell.x].resources.food = 50 + Math.floor(random() * 50); // 50-99
    grid[cell.y][cell.x].resources.water = 70 + Math.floor(random() * 30); // 70-99
  }
  
  // Create resource gradients from basins