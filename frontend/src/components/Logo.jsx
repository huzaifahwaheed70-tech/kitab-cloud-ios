import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ size = 'md', linkTo = '/', showText = true, className = '', testId = 'logo' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const logoContent = (
    <>
      <img 
        src="/logo.png" 
        alt="Kitab Cloud" 
        className={`${sizeClasses[size]} rounded-sm object-cover`}
      />
      {showText && (
        <span className={`font-serif ${textSizes[size]} font-semibold text-[#FDFBF7]`}>
          Kitab Cloud
        </span>
      )}
    </>
  );

  if (linkTo) {
    return (
      <Link 
        to={linkTo} 
        className={`flex items-center gap-3 ${className}`}
        data-testid={testId}
      >
        {logoContent}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid={testId}>
      {logoContent}
    </div>
  );
};

export default Logo;
