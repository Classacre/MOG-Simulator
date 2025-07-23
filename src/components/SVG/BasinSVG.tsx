import React from 'react';
import { Basin } from '../../models/Basin';
import type { IAgent } from '../../models/types';

interface BasinSVGProps {
  basin: Basin;
  size: number;
  onClick?: () => void;
  isSelected?: boolean;
}

const BasinSVG: React.FC<BasinSVGProps> = ({
  basin,
  size,
  onClick,
  isSelected = false
}) => {
  // Generate a color based on basin ID
  const getBasinColor = () => {
    const basinHash = basin.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = basinHash % 360;
    return `hsl(${hue}, 70%, 40%)`;
  };

  // Get lighter variant of the basin color for highlights
  const getHighlightColor = () => {
    const basinHash = basin.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = basinHash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Get population percentage (for visualization)
  const getPopulationPercentage = () => {
    const aliveAgents = basin.population.filter((agent: IAgent) => agent.status !== 'dead').length;
    const totalAgents = basin.population.length;
    return totalAgents > 0 ? aliveAgents / totalAgents : 0;
  };

  const baseColor = getBasinColor();
  const highlightColor = getHighlightColor();
  const populationPercentage = getPopulationPercentage();

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
      {/* Base basin shape - a settlement/camp */}
      <g>
        {/* Background */}
        <rect x="0" y="0" width="16" height="16" fill="#065f46" /> {/* bg-emerald-700 */}
        
        {/* Water/ground texture */}
        <rect x="2" y="3" width="2" height="1" fill="#059669" /> {/* bg-emerald-600 */}
        <rect x="6" y="2" width="3" height="1" fill="#059669" />
        <rect x="12" y="4" width="2" height="1" fill="#059669" />
        <rect x="4" y="7" width="2" height="1" fill="#059669" />
        <rect x="9" y="8" width="3" height="1" fill="#059669" />
        <rect x="3" y="12" width="2" height="1" fill="#059669" />
        <rect x="11" y="13" width="3" height="1" fill="#059669" />
        
        {/* Central settlement structure */}
        <rect x="6" y="5" width="4" height="6" fill={baseColor} /> {/* Main building */}
        <rect x="5" y="6" width="6" height="4" fill={baseColor} /> {/* Wider middle */}
        
        {/* Building details */}
        <rect x="7" y="5" width="2" height="1" fill={highlightColor} /> {/* Window/door */}
        <rect x="6" y="7" width="1" height="2" fill={highlightColor} /> {/* Window */}
        <rect x="9" y="7" width="1" height="2" fill={highlightColor} /> {/* Window */}
        
        {/* Population indicator - fills based on alive population percentage */}
        <rect 
          x="6" 
          y="10" 
          width={4 * populationPercentage} 
          height="1" 
          fill="#fbbf24" 
        />
      </g>

      {/* Selection indicator */}
      {isSelected && (
        <rect 
          x="0" 
          y="0" 
          width="16" 
          height="16" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="1" 
        />
      )}
      
      {/* Basin name indicator */}
      <text
        x="8"
        y="15"
        fontSize="3"
        textAnchor="middle"
        fill="#ffffff"
        style={{ fontWeight: 'bold' }}
      >
        B
      </text>
    </svg>
  );
};

export default BasinSVG;