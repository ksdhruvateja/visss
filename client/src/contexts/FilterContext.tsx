import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FilterOptions } from '@/types';

// Define the shape of our context
interface FilterContextType {
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  activeItem: {
    type: 'industry' | 'location' | 'jobTitle' | 'experienceLevel' | null;
    value: string | null;
  };
  setActiveItem: (item: { type: 'industry' | 'location' | 'jobTitle' | 'experienceLevel' | null; value: string | null }) => void;
}

// Create the context with default values
const FilterContext = createContext<FilterContextType>({
  filters: {
    experienceLevels: [],
    locations: [],
    industries: [],
    employmentTypes: [],
  },
  setFilters: () => {},
  activeItem: { type: null, value: null },
  setActiveItem: () => {},
});

// Hook for accessing the context
export const useFilterContext = () => useContext(FilterContext);

// Provider component
export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterOptions>({
    experienceLevels: [],
    locations: [],
    industries: [],
    employmentTypes: [],
  });

  const [activeItem, setActiveItem] = useState<{
    type: 'industry' | 'location' | 'jobTitle' | 'experienceLevel' | null;
    value: string | null;
  }>({
    type: null,
    value: null,
  });

  return (
    <FilterContext.Provider value={{ filters, setFilters, activeItem, setActiveItem }}>
      {children}
    </FilterContext.Provider>
  );
};