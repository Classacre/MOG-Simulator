import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Cell } from '../../models/Cell';
import { Basin } from '../../models/Basin';
import { Dungeon } from '../../models/Dungeon';
import type { IAgent } from '../../models/types';
import CellComponent from './Cell.tsx';
import AgentComponent from './Agent.tsx';

interface MazeGridProps {
  grid: Cell[][];
  agents: IAgent[];
  basins?: Basin[];
  dungeons?: Dungeon[];
  cellSize?: number;
  selectedAgent?: IAgent | null;
  selectedDungeon?: { id: string } | null;
  onCellClick?: (cell: Cell) => void;
  onAgentClick?: (agent: IAgent) => void;
  onBasinClick?: (basin: Basin) => void;
  onDungeonClick?: (dungeon: Dungeon) => void;
  highlightNotable?: boolean;
}

const MazeGrid: React.FC<MazeGridProps> = ({
  grid,
  agents,
  basins = [],
  dungeons = [],
  cellSize = 16,
  selectedAgent = null,
  selectedDungeon = null,
  onCellClick,
  onAgentClick,
  onBasinClick,
  onDungeonClick,
  highlightNotable = true
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Calculate grid dimensions
  const gridWidth = grid[0]?.length || 0;
  const gridHeight = grid.length || 0;
  const totalWidth = gridWidth * cellSize * zoom;
  const totalHeight = gridHeight * cellSize * zoom;

  // Initialize viewport dimensions and center the grid
  useEffect(() => {
    if (gridRef.current) {
      const { clientWidth, clientHeight } = gridRef.current;
      setViewportWidth(clientWidth);
      setViewportHeight(clientHeight);
      
      // Center the grid in the viewport
      setOffsetX((clientWidth - totalWidth) / 2);
      setOffsetY((clientHeight - totalHeight) / 2);
    }
  }, [gridWidth, gridHeight, totalWidth, totalHeight]);

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX - offsetX);
    setDragStartY(e.clientY - offsetY);
  };

  // Throttle mouse move events for performance
  const throttleMouseMove = (
    func: (e: React.MouseEvent) => void,
    delay: number
  ): ((e: React.MouseEvent) => void) => {
    let lastCall = 0;
    return (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(e);
      }
    };
  };
  
  // Throttle wheel events for performance
  const throttleWheel = (
    func: (e: React.WheelEvent) => void,
    delay: number
  ): ((e: React.WheelEvent) => void) => {
    let lastCall = 0;
    return (e: React.WheelEvent) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(e);
      }
    };
  };

  // Handle mouse move for dragging (throttled)
  const handleMouseMove = useCallback(
    throttleMouseMove((e: React.MouseEvent) => {
      if (isDragging) {
        setOffsetX(e.clientX - dragStartX);
        setOffsetY(e.clientY - dragStartY);
      }
    }, 16), // ~60fps
    [isDragging, dragStartX, dragStartY]
  );

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse leave to stop dragging
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Handle wheel for zooming (throttled)
  const handleWheel = useCallback(
    throttleWheel((e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));
      
      // Adjust offset to zoom around the cursor position
      const rect = gridRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const mouseGridX = (mouseX - offsetX) / (cellSize * zoom);
        const mouseGridY = (mouseY - offsetY) / (cellSize * zoom);
        
        const newOffsetX = mouseX - mouseGridX * cellSize * newZoom;
        const newOffsetY = mouseY - mouseGridY * cellSize * newZoom;
        
        setZoom(newZoom);
        setOffsetX(newOffsetX);
        setOffsetY(newOffsetY);
      }
    }, 16), // ~60fps
    [zoom, offsetX, offsetY, cellSize]
  );

  // Determine visible cells for rendering optimization (memoized)
  const visibleCells = useMemo(() => {
    const startCol = Math.max(0, Math.floor(-offsetX / (cellSize * zoom)));
    const endCol = Math.min(gridWidth, Math.ceil((viewportWidth - offsetX) / (cellSize * zoom)));
    const startRow = Math.max(0, Math.floor(-offsetY / (cellSize * zoom)));
    const endRow = Math.min(gridHeight, Math.ceil((viewportHeight - offsetY) / (cellSize * zoom)));
    
    const cells: React.ReactNode[] = [];
    
    // Only render if we have valid dimensions
    if (viewportWidth === 0 || viewportHeight === 0) {
      return cells;
    }
    
    // Debug: Log the number of cells of each type
    let wallCount = 0;
    let pathCount = 0;
    let basinCount = 0;
    let dungeonCount = 0;
    
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        if (grid[row] && grid[row][col]) {
          const cell = grid[row][col];
          
          // Count cell types for debugging
          if (cell.type === 'wall') wallCount++;
          else if (cell.type === 'path') pathCount++;
          else if (cell.type === 'basin') basinCount++;
          else if (cell.type === 'dungeon') dungeonCount++;
          
          // Skip basin and dungeon cells, they'll be rendered separately
          if (cell.type !== 'basin' && cell.type !== 'dungeon') {
            cells.push(
              <CellComponent
                key={`cell-${row}-${col}`}
                cell={cell}
                size={cellSize * zoom}
                x={offsetX + col * cellSize * zoom}
                y={offsetY + row * cellSize * zoom}
                isSelectedDungeon={false}
                onClick={() => onCellClick && onCellClick(cell)}
              />
            );
          }
        }
      }
    }
    
    // Debug: Log the counts
    console.log(`Cell counts - Wall: ${wallCount}, Path: ${pathCount}, Basin: ${basinCount}, Dungeon: ${dungeonCount}`);
    
    return cells;
  }, [
    grid,
    offsetX,
    offsetY,
    zoom,
    cellSize,
    viewportWidth,
    viewportHeight,
    gridWidth,
    gridHeight,
    onCellClick
  ]);
  
  // Render basins (memoized)
  const visibleBasins = useMemo(() => {
    // Only render if we have valid dimensions
    if (viewportWidth === 0 || viewportHeight === 0) {
      return [];
    }
    
    return basins
      .filter(basin => {
        const x = offsetX + basin.location.x * cellSize * zoom;
        const y = offsetY + basin.location.y * cellSize * zoom;
        
        // Check if basin is in viewport
        return !(
          x < -cellSize || x > viewportWidth + cellSize ||
          y < -cellSize || y > viewportHeight + cellSize
        );
      })
      .map(basin => {
        const x = offsetX + basin.location.x * cellSize * zoom;
        const y = offsetY + basin.location.y * cellSize * zoom;
        
        // Find the cell for this basin
        const cell = grid[basin.location.y]?.[basin.location.x];
        if (!cell) return null;
        
        return (
          <CellComponent
            key={`basin-${basin.id}`}
            cell={cell}
            size={cellSize * zoom}
            x={x}
            y={y}
            isSelectedDungeon={false}
            onClick={() => onBasinClick && onBasinClick(basin)}
          />
        );
      });
  }, [
    basins,
    offsetX,
    offsetY,
    zoom,
    cellSize,
    viewportWidth,
    viewportHeight,
    grid,
    onBasinClick
  ]);
  
  // Render dungeons (memoized)
  const visibleDungeons = useMemo(() => {
    // Only render if we have valid dimensions
    if (viewportWidth === 0 || viewportHeight === 0) {
      return [];
    }
    
    return dungeons
      .filter(dungeon => {
        const x = offsetX + dungeon.location.x * cellSize * zoom;
        const y = offsetY + dungeon.location.y * cellSize * zoom;
        
        // Check if dungeon is in viewport
        return !(
          x < -cellSize || x > viewportWidth + cellSize ||
          y < -cellSize || y > viewportHeight + cellSize
        );
      })
      .map(dungeon => {
        const x = offsetX + dungeon.location.x * cellSize * zoom;
        const y = offsetY + dungeon.location.y * cellSize * zoom;
        
        // Find the cell for this dungeon
        const cell = grid[dungeon.location.y]?.[dungeon.location.x];
        if (!cell) return null;
        
        return (
          <CellComponent
            key={`dungeon-${dungeon.id}`}
            cell={cell}
            size={cellSize * zoom}
            x={x}
            y={y}
            isSelectedDungeon={selectedDungeon?.id === dungeon.id}
            onClick={() => onDungeonClick && onDungeonClick(dungeon)}
          />
        );
      });
  }, [
    dungeons,
    offsetX,
    offsetY,
    zoom,
    cellSize,
    viewportWidth,
    viewportHeight,
    grid,
    selectedDungeon,
    onDungeonClick
  ]);

  // Render agents (memoized)
  const visibleAgents = useMemo(() => {
    // Only render if we have valid dimensions
    if (viewportWidth === 0 || viewportHeight === 0) {
      return [];
    }
    
    return agents
      .filter(agent => {
        if (agent.status === 'dead') return false;
        
        const x = offsetX + agent.location.x * cellSize * zoom;
        const y = offsetY + agent.location.y * cellSize * zoom;
        
        // Check if agent is in viewport
        return !(
          x < -cellSize || x > viewportWidth + cellSize ||
          y < -cellSize || y > viewportHeight + cellSize
        );
      })
      .map(agent => {
        const x = offsetX + agent.location.x * cellSize * zoom;
        const y = offsetY + agent.location.y * cellSize * zoom;
        
        return (
          <AgentComponent
            key={`agent-${agent.id}`}
            agent={agent}
            x={x}
            y={y}
            size={cellSize * zoom * 0.5}
            isSelected={selectedAgent?.id === agent.id}
            isHighlighted={highlightNotable && agent.isNotable}
            onClick={() => onAgentClick && onAgentClick(agent)}
          />
        );
      });
  }, [
    agents,
    offsetX,
    offsetY,
    zoom,
    cellSize,
    viewportWidth,
    viewportHeight,
    selectedAgent,
    onAgentClick,
    highlightNotable
  ]);

  return (
    <div
      ref={gridRef}
      className="relative overflow-hidden w-full h-full bg-gray-900"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {visibleCells}
      {visibleBasins}
      {visibleDungeons}
      {visibleAgents}
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button
          className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center"
          onClick={() => setZoom(Math.min(3, zoom * 1.2))}
        >
          +
        </button>
        <button
          className="bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center"
          onClick={() => setZoom(Math.max(0.5, zoom / 1.2))}
        >
          -
        </button>
      </div>
      
      {/* Reset view button */}
      <button
        className="absolute bottom-4 left-4 bg-gray-800 text-white px-2 py-1 rounded"
        onClick={useCallback(() => {
          if (gridRef.current) {
            const { clientWidth, clientHeight } = gridRef.current;
            setZoom(1);
            setOffsetX((clientWidth - totalWidth) / 2);
            setOffsetY((clientHeight - totalHeight) / 2);
          }
        }, [totalWidth, totalHeight])}
      >
        Reset View
      </button>
    </div>
  );
};

export default MazeGrid;