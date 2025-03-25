import React from 'react';

interface ScoreIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Score indicator component to visually represent authenticity scores
 * Scores range from 1-10:
 * - 1-3: Red (Low authenticity)
 * - 4-6: Yellow (Medium authenticity)
 * - 7-10: Green (High authenticity)
 */
const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({ score, size = 'md' }) => {
  // Validate score
  const validScore = Math.max(1, Math.min(10, Math.round(score)));
  
  // Determine color based on score
  let color = '';
  let textColor = '';
  let label = '';
  
  if (validScore <= 3) {
    color = 'bg-red-500';
    textColor = 'text-red-700';
    label = 'Low Authenticity';
  } else if (validScore <= 6) {
    color = 'bg-yellow-400';
    textColor = 'text-yellow-700';
    label = 'Medium Authenticity';
  } else {
    color = 'bg-green-500';
    textColor = 'text-green-700';
    label = 'High Authenticity';
  }
  
  // Determine size classes
  let sizeClasses = '';
  let fontSizeClass = '';
  let textSizeClass = '';
  
  switch (size) {
    case 'sm':
      sizeClasses = 'w-8 h-8';
      fontSizeClass = 'text-xs';
      textSizeClass = 'text-xs';
      break;
    case 'lg':
      sizeClasses = 'w-16 h-16';
      fontSizeClass = 'text-2xl';
      textSizeClass = 'text-sm';
      break;
    case 'md':
    default:
      sizeClasses = 'w-12 h-12';
      fontSizeClass = 'text-xl';
      textSizeClass = 'text-xs';
      break;
  }
  
  return (
    <div className="flex flex-col items-center">
      <div className={`${sizeClasses} rounded-full ${color} flex items-center justify-center mb-1`}>
        <span className={`${fontSizeClass} font-bold text-white`}>{validScore}</span>
      </div>
      <span className={`${textSizeClass} ${textColor} font-medium`}>{label}</span>
    </div>
  );
};

export default ScoreIndicator;