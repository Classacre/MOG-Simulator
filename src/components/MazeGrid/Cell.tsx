import React from 'react';
import { Cell } from '../../models/Cell';

interface CellProps {
  cell: Cell;
  size: number;
  x: number;
  y: number;
  onClick?: () => void;
  isSelectedDungeon?: boolean;
}

const CellComponent: React.FC<CellProps> = ({
  cell,
  size,
  x,
  y,
  onClick,
  isSelectedDungeon = false
}) => {
  // Determine cell background color based on type
  const getCellBackgroundColor = () => {
    switch (cell.type) {
      case 'wall':
        return '#000000'; // Black
      case 'path':
        return '#9CA3AF'; // Gray-400 equivalent
      case 'basin':
        return '#10B981'; // Emerald-500 equivalent
      case 'dungeon':
        return isSelectedDungeon ? '#8B5CF6' : '#6D28D9'; // Purple-500/700 equivalent
      default:
        return '#4B5563'; // Gray-700 equivalent
    }
  };

  // Determine resource indicators
  const showResourceIndicator = () => {
    if (cell.type === 'wall') return null;
    
    const { food, water } = cell.resources;
    const totalResources = food + water;
    
    if (totalResources === 0) return null;
    
    // Determine size of indicator based on resource amount
    const indicatorSize = Math.min(size / 3, Math.max(size / 6, Math.sqrt(totalResources) / 2));
    
    // Determine color based on resource type
    let color = '#9CA3AF'; // Gray-400 Default
    
    if (food > water) {
      color = '#F59E0B'; // Yellow-500 Food
    } else if (water > food) {
      color = '#3B82F6'; // Blue-500 Water
    } else {
      color = '#10B981'; // Green-500 Equal
    }
    
    return (
      <div
        style={{
          position: 'absolute',
          width: `${indicatorSize}px`,
          height: `${indicatorSize}px`,
          borderRadius: '50%',
          backgroundColor: color,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />
    );
  };

  // Show dungeon indicator
  const showDungeonIndicator = () => {
    if (cell.type !== 'dungeon') return null;
    
    const indicatorSize = size * 0.6;
    
    return (
      <div
        style={{
          position: 'absolute',
          width: `${indicatorSize}px`,
          height: `${indicatorSize}px`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: `${size * 0.3}px`,
          color: isSelectedDungeon ? '#FCD34D' : '#C4B5FD', // Yellow-300 or Purple-300
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        D
      </div>
    );
  };
  
  // Cell type indicator with inline styles
  const getCellTypeIndicator = () => {
    switch (cell.type) {
      case 'wall':
        return (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000000'
          }} />
        );
      case 'basin':
        return (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '75%',
              height: '75%',
              borderRadius: '50%',
              backgroundColor: '#6EE7B7'
            }} />
          </div>
        );
      case 'dungeon':
        return (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#6D28D9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '50%',
              height: '50%',
              backgroundColor: '#C4B5FD',
              transform: 'rotate(45deg)'
            }} />
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div
      style={{
        position: 'absolute',
        width: `${size}px`,
        height: `${size}px`,
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: getCellBackgroundColor(),
        border: '0.5px solid #111827', // border-gray-900
        imageRendering: 'pixelated',
        ...(isSelectedDungeon ? {
          boxShadow: '0 0 0 2px #FBBF24', // ring-2 ring-yellow-400
          zIndex: 10
        } : {}),
        ...(cell.type === 'dungeon' ? {
          cursor: 'pointer'
        } : {})
      }}
      onClick={onClick}
    >
      {getCellTypeIndicator()}
      {showResourceIndicator()}
      {showDungeonIndicator()}
    </div>
  );
};

export default CellComponent;