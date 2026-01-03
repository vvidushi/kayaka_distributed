import { useState } from 'react';

const AnimatedIcon = ({ 
  children, 
  className = '', 
  animation = 'pulse',
  hover = true,
  onClick,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e) => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    if (onClick) onClick(e);
  };

  const baseClasses = 'transition-all duration-200 ease-in-out';
  const hoverClasses = hover ? 'hover:scale-110 hover:rotate-3' : '';
  const clickClasses = isClicked ? 'scale-95' : '';
  const animationClasses = `animate-${animation}`;

  return (
    <span
      className={`inline-block ${baseClasses} ${hoverClasses} ${clickClasses} ${animationClasses} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {children}
    </span>
  );
};

export default AnimatedIcon;

