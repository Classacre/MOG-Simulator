import React from 'react';
import { Cell } from '../../models/Cell';

interface CellSVGProps {
  cell: Cell;
  size: number;
  onClick?: () => void;
  isSelectedDungeon?: boolean;
}

const CellSVG: React.FC<CellSVGProps> = ({
  cell,
  size,
  onClick,
  isSelectedDungeon = false
}) => {
  // Determine cell color based on type
  const getCellColor = () => {
    switch (cell.type) {
      case 'wall':
        return '#1f2937'; // bg-gray-800
      case 'path':
        return '#4b5563'; // bg-gray-600
      case 'basin':
        return '#065f46'; // bg-emerald-700
      case 'dungeon':
        return isSelectedDungeon ? '#9333ea' : '#6b21a8'; // bg-purple-600 or bg-purple-800
      default:
        return '#374151'; // bg-gray-700
    }
  };

  // Determine resource color
  const getResourceColor = () => {
    const { food, water } = cell.resources;
    
    if (food > water) {
      return '#eab308'; // bg-yellow-500 (Food)
    } else if (water > food) {
      return '#3b82f6'; // bg-blue-500 (Water)
    } else {
      return '#22c55e'; // bg-green-500 (Equal)
    }
  };

  // Determine resource size
  const getResourceSize = () => {
    const { food, water } = cell.resources;
    const totalResources = food + water;
    
    if (totalResources === 0) return 0;
    
    // Size based on resource amount (1-3 pixels)
    return Math.min(3, Math.max(1, Math.ceil(Math.sqrt(totalResources) / 2)));
  };

  // Create pixelated patterns for different cell types
  const renderCellPattern = () => {
    switch (cell.type) {
      case 'wall':
        // Brick-like pattern
        return (
          <g>
            <rect x="0" y="0" width="8" height="8" fill={getCellColor()} />
            <rect x="0" y="2" width="4" height="1" fill="#111827" />
            <rect x="4" y="4" width="4" height="1" fill="#111827" />
            <rect x="0" y="6" width="4" height="1" fill="#111827" />
          </g>
        );
      case 'basin':
        // Basin pattern with water-like pixels
        return (
          <g>
            <rect x="0" y="0" width="8" height="8" fill={getCellColor()} />
            <rect x="1" y="1" width="2" height="1" fill="#10b981" />
            <rect x="5" y="2" width="2" height="1" fill="#10b981" />
            <rect x="3" y="4" width="2" height="1" fill="#10b981" />
            <rect x="6" y="6" width="1" height="1" fill="#10b981" />
          </g>
        );
      case 'dungeon':
        // Dungeon entrance pattern
        return (
          <g>
            <rect x="0" y="0" width="8" height="8" fill={getCellColor()} />
            <rect x="2" y="1" width="4" height="6" fill="#4c1d95" />
            <rect x="3" y="2" width="2" height="4" fill="#000000" />
            {isSelectedDungeon && (
              <rect x="0" y="0" width="8" height="8" stroke="#facc15" strokeWidth="1" fill="none" />
            )}
          </g>
        );
      case 'path':
      default:
        // Simple path with some texture
        return (
          <g>
            <rect x="0" y="0" width="8" height="8" fill={getCellColor()} />
            <rect x="2" y="2" width="1" height="1" fill="#374151" />
            <rect x="5" y="4" width="1" height="1" fill="#374151" />
            <rect x="3" y="6" width="1" height="1" fill="#374151" />
          </g>
        );
    }
  };

  // Render resource indicator if present
  const renderResourceIndicator = () => {
    const resourceSize = getResourceSize();
    if (resourceSize === 0 || cell.type === 'wall') return null;
    
    return (
      <circle 
        cx="4" 
        cy="4" 
        r={resourceSize} 
        fill={getResourceColor()} 
      />
    );
  };

  // Render dungeon letter if it's a dungeon
  const renderDungeonIndicator = () => {
    if (cell.type !== 'dungeon') return null;
    
    return (
      <text
        x="4"
        y="5"
        fontSize="4"
        textAnchor="middle"
        fill={isSelectedDungeon ? "#fde047" : "#d8b4fe"}
        style={{ fontWeight: 'bold' }}
      >
        D
      </text>
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        cursor: cell.type === 'dungeon' ? 'pointer' : 'default',
        zIndex: isSelectedDungeon ? 10 : 1
      }}
      onClick={onClick}
    >
      {/* Base cell pattern */}
      {renderCellPattern()}
      
      {/* Resource indicator */}
      {renderResourceIndicator()}
      
      {/* Dungeon indicator */}
      {renderDungeonIndicator()}
      
      {/* Border */}
      <rect 
        x="0" 
        y="0" 
        width="8" 
        height="8" 
        fill="none" 
        stroke="#111827" 
        strokeWidth="0.5" 
      />
    </svg>
  );
};

export default CellSVG;