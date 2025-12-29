import React, { useRef, useEffect, type MouseEvent } from 'react';
import "./css/glassbutton.css";

// 1. Define the props interface
interface GlassButtonProps {
  children?: React.ReactNode;
  onClick?: () => void; // Optional to fix the error in Home.tsx
}

// 2. Define the mutable state interface for the ref
interface AnimationState {
  mouseX: number;
  mouseY: number;
  currX: number;
  currY: number;
  isHovering: boolean;
}

const GlassButton = ({ children = "EXPLORE", onClick }: GlassButtonProps) => {
  // 3. Explicitly type the refs
  const btnRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);
  
  // Mutable state to avoid React re-renders
  const state = useRef<AnimationState>({
    mouseX: 0,
    mouseY: 0,
    currX: 0,
    currY: 0,
    isHovering: false,
  });

  useEffect(() => {
    // 0.1 = Heavy/Slow trail, 0.9 = Instant
    const SMOOTHING_FACTOR = 0.15;

    const animate = () => {
      if (btnRef.current && state.current.isHovering) {
        const { mouseX, mouseY, currX, currY } = state.current;

        // Calculate distance to move
        const newX = currX + (mouseX - currX) * SMOOTHING_FACTOR;
        const newY = currY + (mouseY - currY) * SMOOTHING_FACTOR;

        // Update state
        state.current.currX = newX;
        state.current.currY = newY;

        // Apply coordinates to CSS variables
        btnRef.current.style.setProperty('--x', `${newX}px`);
        btnRef.current.style.setProperty('--y', `${newY}px`);
      }
      
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // 4. Type the MouseEvent specifically for a button element
  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      state.current.mouseX = e.clientX - rect.left;
      state.current.mouseY = e.clientY - rect.top;
      state.current.isHovering = true;
    }
  };

  const handleMouseLeave = () => {
    state.current.isHovering = false;
  };

  return (
    <button
      ref={btnRef}
      className="glass-btn"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <span>{children}</span>
    </button>
  );
};

export default GlassButton;