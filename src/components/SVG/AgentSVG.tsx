import React from 'react';
import type { IAgent } from '../../models/types';

interface AgentSVGProps {
  agent: IAgent;
  size: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

const AgentSVG: React.FC<AgentSVGProps> = ({
  agent,
  size,
  isSelected = false,
  isHighlighted = true,
  onClick
}) => {
  // Determine agent color based on basin origin (hash the basin ID to a color)
  const getAgentColor = () => {
    const basinHash = agent.basinOrigin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = basinHash % 360;
    
    // Adjust saturation and lightness based on status
    let saturation = 70;
    let lightness = 50;
    
    if (agent.status === 'injured') {
      saturation = 100;
      lightness = 70;
    }
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Determine size modifier based on agent's notability
  const getSizeModifier = () => {
    if (isHighlighted && agent.isNotable) {
      return 1.3; // Notable agents are 30% larger
    }
    
    if (agent.augment) {
      return 1.2; // Agents with augments are 20% larger
    }
    
    return 1;
  };

  // Determine opacity based on agent's health
  const getOpacity = () => {
    return Math.max(0.5, agent.stats.health / 100);
  };

  // Calculate final size with modifiers
  const finalSize = size * getSizeModifier();
  
  // Create a pixelated agent shape
  return (
    <svg
      width={finalSize}
      height={finalSize}
      viewBox="0 0 8 8"
      style={{
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: isSelected ? 10 : (isHighlighted && agent.isNotable ? 5 : 1),
        opacity: getOpacity(),
        transition: 'all 0.2s ease'
      }}
      onClick={onClick}
    >
      {/* Base agent shape - pixelated circle */}
      <g className="agent-body">
        {/* Pixelated circle approximation */}
        <rect x="2" y="1" width="4" height="1" fill={getAgentColor()} />
        <rect x="1" y="2" width="6" height="1" fill={getAgentColor()} />
        <rect x="1" y="3" width="6" height="2" fill={getAgentColor()} />
        <rect x="1" y="5" width="6" height="1" fill={getAgentColor()} />
        <rect x="2" y="6" width="4" height="1" fill={getAgentColor()} />
      </g>

      {/* Selection border */}
      {isSelected && (
        <g className="selection-indicator">
          <rect x="1" y="0" width="6" height="1" fill="white" />
          <rect x="0" y="1" width="1" height="6" fill="white" />
          <rect x="7" y="1" width="1" height="6" fill="white" />
          <rect x="1" y="7" width="6" height="1" fill="white" />
        </g>
      )}

      {/* Notable indicator */}
      {isHighlighted && agent.isNotable && !isSelected && (
        <g className="notable-indicator">
          <rect x="1" y="0" width="6" height="1" fill="#fbbf24" />
          <rect x="0" y="1" width="1" height="6" fill="#fbbf24" />
          <rect x="7" y="1" width="1" height="6" fill="#fbbf24" />
          <rect x="1" y="7" width="6" height="1" fill="#fbbf24" />
        </g>
      )}

      {/* Augment indicator */}
      {agent.augment && (
        <g className="augment-indicator">
          <rect x="5" y="0" width="2" height="2" fill="#a855f7" />
        </g>
      )}

      {/* Injured indicator */}
      {agent.status === 'injured' && (
        <g className="injured-indicator">
          <rect x="0" y="5" width="2" height="2" fill="#ef4444" />
        </g>
      )}
    </svg>
  );
};

export default AgentSVG;