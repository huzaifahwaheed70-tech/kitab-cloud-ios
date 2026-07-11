import { useState, useEffect } from 'react';

/**
 * Debounce hook - delays updating a value until after a specified delay
 * Useful for search inputs to avoid excessive API calls
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

export default useDebounce;
