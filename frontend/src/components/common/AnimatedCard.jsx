import { useEffect, useRef } from 'react';

const AnimatedCard = ({ 
  children, 
  className = '', 
  delay = 0,
  animation = 'fadeInUp',
  hover = true,
  ...props 
}) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('animate-in');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [delay]);

  const animationClass = `animate-${animation}`;
  const hoverClass = hover ? 'hover:scale-[1.02]' : '';

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-300 ease-out ${animationClass} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedCard;
