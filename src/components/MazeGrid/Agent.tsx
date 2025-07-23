import React from 'react';
import type { IAgent } from '../../models/types';

interface AgentProps {
  agent: IAgent;
  x: number;
  y: number;
  size: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

const AgentComponent: React.FC<AgentProps> = ({
  agent,
  x,
  y,
  size,
  isSelected = false,
  isHighlighted = true,
  onClick
}) => {
  // Determine agent color based on status and basin origin
  const getAgentColor = () => {
    // Base color from basin origin (hash the basin ID to a color)
    const basinHash = agent.basinOrigin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = basinHash % 360;
    
    // Adjust saturation and lightness based on status
    let saturation = '70%';
    let lightness = '50%';
    
    if (agent.status === 'injured') {
      saturation = '100%';
      lightness = '70%';
    }
    
    return `hsl(${hue}, ${saturation}, ${lightness})`;
  };

  // Determine border color for notable agents or selected agent
  const getBorderColor = () => {
    if (isSelected) {
      return 'border-white';
    }
    
    if (isHighlighted && agent.isNotable) {
      return 'border-yellow-400';
    }
    
    return 'border-transparent';
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

  return (
    <div
      className={`absolute rounded-full border-2 ${getBorderColor()} pixelated cursor-pointer transition-all duration-200 hover:scale-110`}
      style={{
        width: `${finalSize}px`,
        height: `${finalSize}px`,
        left: `${x}px`,
        top: `${y}px`,
        backgroundColor: getAgentColor(),
        opacity: getOpacity(),
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 10 : (isHighlighted && agent.isNotable ? 5 : 1)
      }}
      onClick={onClick}
      title={`${agent.name} (${agent.status})`}
    >
      {/* Augment indicator */}
      {agent.augment && (
        <div
          className="absolute rounded-full bg-purple-500"
          style={{
            width: `${finalSize / 3}px`,
            height: `${finalSize / 3}px`,
            top: '-2px',
            right: '-2px'
          }}
        />
      )}
      
      {/* Injured indicator */}
      {agent.status === 'injured' && (
        <div
          className="absolute rounded-full bg-red-500"
          style={{
            width: `${finalSize / 3}px`,
            height: `${finalSize / 3}px`,
            bottom: '-2px',
            left: '-2px'
          }}
        />
      )}
    </div>
  );
};

export default AgentComponent;