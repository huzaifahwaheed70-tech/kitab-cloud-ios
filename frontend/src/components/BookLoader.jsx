import React, { useState, useEffect } from 'react';
import './BookLoader.css';

/**
 * Premium Book Loader Animation
 * Features:
 * - Dashed circular line chasing around the book
 * - Book that opens and closes smoothly
 * - On complete: book pops into pieces and dissolves
 */
const BookLoader = ({ onComplete, message = "Loading..." }) => {
  const [isDissolving, setIsDissolving] = useState(false);
  const [particles, setParticles] = useState([]);

  // Generate particles for the explosion/dissolution effect
  const generateParticles = () => {
    const newParticles = [];
    // Create book piece particles
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      newParticles.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: Math.random() * 720 - 360,
        scale: Math.random() * 0.6 + 0.4,
        delay: Math.random() * 0.2,
        type: i % 3 === 0 ? 'cover' : 'page', // Mix of cover and page pieces
      });
    }
    setParticles(newParticles);
  };

  const triggerDissolve = () => {
    generateParticles();
    setIsDissolving(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 1000);
  };

  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(triggerDissolve, 2000);
      return () => clearTimeout(timer);
    }
  }, [onComplete]);

  return (
    <div className="book-loader-container">
      {/* Chasing circular line */}
      <div className={`chase-ring ${isDissolving ? 'dissolving' : ''}`}>
        <svg viewBox="0 0 100 100" className="chase-svg">
          <circle 
            className="chase-circle"
            cx="50" 
            cy="50" 
            r="42"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="2"
            strokeDasharray="20 15"
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      {/* Book in center */}
      <div className={`book-loader ${isDissolving ? 'dissolving' : ''}`}>
        {/* Book spine */}
        <div className="book-spine"></div>
        
        {/* Book pages (inside) */}
        <div className="book-pages">
          <div className="page page-1"></div>
          <div className="page page-2"></div>
          <div className="page page-3"></div>
        </div>
        
        {/* Book cover (back) */}
        <div className="book-cover book-cover-back"></div>
        
        {/* Book cover (front) - opens and closes */}
        <div className="book-cover book-cover-front"></div>
        
        {/* Explosion particles */}
        {isDissolving && particles.map((particle) => (
          <div
            key={particle.id}
            className={`book-particle ${particle.type}`}
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
      
      {/* Loading text */}
      <div className={`book-loader-text ${isDissolving ? 'fade-out' : ''}`}>
        <span>{message}</span>
        <span className="loading-dots">
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </span>
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
      <div className="spinner-ring">
        <svg viewBox="0 0 50 50">
          <circle 
            cx="25" 
            cy="25" 
            r="20"
            fill="none"
            stroke="#D4AF37"
            strokeWidth="2"
            strokeDasharray="15 10"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="spinner-book-mini">
        <div className="mini-page"></div>
      </div>
    </div>
  );
};

export default BookLoader;
