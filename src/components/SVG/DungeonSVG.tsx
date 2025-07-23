import React from 'react';
import { Dungeon } from '../../models/Dungeon';

interface DungeonSVGProps {
  dungeon: Dungeon;
  size: number;
  onClick?: () => void;
  isSelected?: boolean;
}

const DungeonSVG: React.FC<DungeonSVGProps> = ({
  dungeon,
  size,
  onClick,
  isSelected = false
}) => {
  // Get color based on dungeon difficulty
  const getDifficultyColor = () => {
    // Color ranges from green (easy) to red (hard)
    if (dungeon.difficulty <= 3) {
      return '#22c55e'; // green-500
    } else if (dungeon.difficulty <= 6) {
      return '#eab308'; // yellow-500
    } else {
      return '#ef4444'; // red-500
    }
  };

  // Get success rate visualization
  const getSuccessRateVisualization = () => {
    const successRate = dungeon.getSuccessRate();
    const totalAttempts = dungeon.getTotalAttempts();
    
    // Only show if there have been attempts
    if (totalAttempts === 0) {
      return null;
    }
    
    // Width based on success rate (0-100%)
    const width = Math.max(1, Math.floor(successRate / 10));
    
    return (
      <rect 
        x="3" 
        y="13" 
        width={width} 
        height="1" 
        fill="#22c55e" 
      />
    );
  };

  // Base colors
  const baseColor = '#6b21a8'; // bg-purple-800
  const selectedColor = '#9333ea'; // bg-purple-600
  const difficultyColor = getDifficultyColor();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        cursor: 'pointer',
        zIndex: isSelected ? 10 : 2
      }}
      onClick={onClick}
    >
      {/* Base dungeon shape - a castle/dungeon entrance */}
      <g>
        {/* Background */}
        <rect x="0" y="0" width="16" height="16" fill={isSelected ? selectedColor : baseColor} />
        
        {/* Dungeon entrance */}
        <rect x="3" y="3" width="10" height="10" fill="#4c1d95" /> {/* bg-purple-900 */}
        <rect x="5" y="5" width="6" height="6" fill="#000000" /> {/* Black entrance */}
        
        {/* Dungeon details - towers */}
        <rect x="2" y="2" width="2" height="2" fill={difficultyColor} /> {/* Left tower */}
        <rect x="12" y="2" width="2" height="2" fill={difficultyColor} /> {/* Right tower */}
        <rect x="2" y="12" width="2" height="2" fill={difficultyColor} /> {/* Bottom left tower */}
        <rect x="12" y="12" width="2" height="2" fill={difficultyColor} /> {/* Bottom right tower */}
        
        {/* Difficulty indicator - number of blocks based on difficulty */}
        {Array.from({ length: Math.min(5, Math.ceil(dungeon.difficulty / 2)) }).map((_, i) => (
          <rect 
            key={`diff-${i}`} 
            x={3 + (i * 2)} 
            y="1" 
            width="1" 
            height="1" 
            fill={difficultyColor} 
          />
        ))}
        
        {/* Success rate indicator */}
        {getSuccessRateVisualization()}
      </g>

      {/* Selection indicator */}
      {isSelected && (
        <rect 
          x="0" 
          y="0" 
          width="16" 
          height="16" 
          fill="none" 
          stroke="#facc15" 
          strokeWidth="1" 
        />
      )}
      
      {/* Dungeon letter */}
      <text
        x="8"
        y="15"
        fontSize="3"
        textAnchor="middle"
        fill="#ffffff"
        style={{ fontWeight: 'bold' }}
      >
        D
      </text>
    </svg>
  );
};

export default DungeonSVG;