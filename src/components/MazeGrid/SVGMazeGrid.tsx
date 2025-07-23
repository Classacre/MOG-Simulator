import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Cell } from '../../models/Cell';
import { Basin } from '../../models/Basin';
import { Dungeon } from '../../models/Dungeon';
import type { IAgent } from '../../models/types';
import { AgentSVG, CellSVG, BasinSVG, DungeonSVG } from '../SVG';

interface SVGMazeGridProps {
  grid: Cell[][];
  agents: IAgent[];
  basins: Basin[];
  dungeons: Dungeon[];
  cellSize?: number;
  selectedAgent?: IAgent | null;
  selectedDungeon?: Dungeon | null;
  onCellClick?: (cell: Cell) => void;
  onAgentClick?: (agent: IAgent) => void;
  onBasinClick?: (basin: Basin) => void;
  onDungeonClick?: (dungeon: Dungeon) => void;
  highlightNotable?: boolean;
}

const SVGMazeGrid: React.FC<SVGMazeGridProps> = ({
  grid,
  agents,
  basins,
  dungeons,
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
    
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        if (grid[row] && grid[row][col]) {
          const cell = grid[row][col];
          
          // Check if this cell is a basin or dungeon
          const isBasin = cell.type === 'basin';
          const isDungeon = cell.type === 'dungeon';
          
          // If it's a regular cell (not basin or dungeon), render CellSVG
          if (!isBasin && !isDungeon) {
            cells.push(
              <div
                key={`cell-${row}-${col}`}
                style={{
                  position: 'absolute',
                  left: `${offsetX + col * cellSize * zoom}px`,
                  top: `${offsetY + row * cellSize * zoom}px`,
                  width: `${cellSize * zoom}px`,
                  height: `${cellSize * zoom}px`,
                }}
              >
                <CellSVG
                  cell={cell}
                  size={cellSize * zoom}
                  onClick={() => onCellClick && onCellClick(cell)}
                  isSelectedDungeon={false}
                />
              </div>
            );
          }
        }
      }
    }
    
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
        
        return (
          <div
            key={`basin-${basin.id}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${cellSize * zoom}px`,
              height: `${cellSize * zoom}px`,
            }}
          >
            <BasinSVG
              basin={basin}
              size={cellSize * zoom}
              onClick={() => onBasinClick && onBasinClick(basin)}
              isSelected={false}
            />
          </div>
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
        
        return (
          <div
            key={`dungeon-${dungeon.id}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${cellSize * zoom}px`,
              height: `${cellSize * zoom}px`,
            }}
          >
            <DungeonSVG
              dungeon={dungeon}
              size={cellSize * zoom}
              onClick={() => onDungeonClick && onDungeonClick(dungeon)}
              isSelected={selectedDungeon?.id === dungeon.id}
            />
          </div>
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
          <div
            key={`agent-${agent.id}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
            }}
          >
            <AgentSVG
              agent={agent}
              size={cellSize * zoom * 0.5}
              isSelected={selectedAgent?.id === agent.id}
              isHighlighted={highlightNotable}
              onClick={() => onAgentClick && onAgentClick(agent)}
            />
          </div>
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
    highlightNotable,
    onAgentClick
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
      
      {/* SVG Mode indicator */}
      <div className="absolute top-4 right-4 bg-purple-800 text-white px-2 py-1 rounded text-xs">
        SVG Pixel Art Mode
      </div>
    </div>
  );
};

export default SVGMazeGrid;