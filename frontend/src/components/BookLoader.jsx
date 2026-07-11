import React, { useState, useEffect } from 'react';
import './BookLoader.css';

const BookLoader = ({ onComplete, message = "Loading..." }) => {
  const [isDissolving, setIsDissolving] = useState(false);
  const [particles, setParticles] = useState([]);

  // Generate particles for dissolution effect
  const generateParticles = () => {
    const newParticles = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        rotation: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        delay: Math.random() * 0.3,
      });
    }
    setParticles(newParticles);
  };

  const triggerDissolve = () => {
    generateParticles();
    setIsDissolving(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 800);
  };

  // Expose triggerDissolve via ref or call it when loading completes
  useEffect(() => {
    // Auto-dissolve after a minimum display time if onComplete is provided
    if (onComplete) {
      const timer = setTimeout(triggerDissolve, 1500);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className="book-loader-container">
      <div className={`book-loader ${isDissolving ? 'dissolving' : ''}`}>
        {/* Book spine */}
        <div className="book-spine"></div>
        
        {/* Book pages */}
        <div className="book-pages">
          <div className="page page-1"></div>
          <div className="page page-2"></div>
          <div className="page page-3"></div>
        </div>
        
        {/* Book cover (front) */}
        <div className="book-cover book-cover-front"></div>
        
        {/* Book cover (back) */}
        <div className="book-cover book-cover-back"></div>
        
        {/* Dissolution particles */}
        {isDissolving && particles.map((particle) => (
          <div
            key={particle.id}
            className="book-particle"
            style={{
              '--particle-x': `${particle.x}px`,
              '--particle-y': `${particle.y}px`,
              '--particle-rotation': `${particle.rotation}deg`,
              '--particle-scale': particle.scale,
              '--particle-delay': `${particle.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* Loading text with animated dots */}
      <div className="book-loader-text">
        <span>{message}</span>
        <span className="loading-dots">
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </span>
      </div>
      
      {/* Progress line */}
      <div className="loader-progress-track">
        <div className="loader-progress-bar"></div>
      </div>
    </div>
  );
};

// Simple spinner version for inline use
export const BookSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`book-spinner ${sizeClasses[size]} ${className}`}>
      <div className="spinner-book">
        <div className="spinner-page"></div>
        <div className="spinner-page"></div>
        <div className="spinner-page"></div>
      </div>
    </div>
  );
};

export default BookLoader;
