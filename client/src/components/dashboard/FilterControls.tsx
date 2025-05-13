import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterOptions } from "@/types";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilterControlsProps {
  onFilterChange: (filters: FilterOptions) => void;
  locations: string[];
  isLoading?: boolean;
}

export default function FilterControls({ onFilterChange, locations, isLoading = false }: FilterControlsProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    experienceLevels: [],
    locations: [],
    industries: [],
    employmentTypes: [],
  });

  // Apply filters when component mounts with empty filters
  useEffect(() => {
    onFilterChange(filters);
  }, [onFilterChange]);

  const handleFilterChange = <K extends keyof FilterOptions>(key: K, value: string, checked: boolean) => {
    setFilters(prev => {
      const currentValues = [...prev[key]];
      
      if (checked) {
        // Add value if not already in array
        if (!currentValues.includes(value)) {
          currentValues.push(value);
        }
      } else {
        // Remove value if in array
        const index = currentValues.indexOf(value);
        if (index !== -1) {
          currentValues.splice(index, 1);
        }
      }
      
      return { ...prev, [key]: currentValues };
    });
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      experienceLevels: [],
      locations: [],
      industries: [],
      employmentTypes: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const removeFilter = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => {
      const newValues = prev[key].filter(v => v !== value);
      return { ...prev, [key]: newValues };
    });
  };

  const experienceLevelOptions = [
    "Entry Level",
    "Mid Level", 
    "Senior Level",
    "Manager",
    "Director"
  ];
  
  const industryOptions = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Manufacturing",
    "Retail",
    "Media",
    "Consulting",
    "Government",
    "Nonprofit"
  ];
  
  const employmentTypeOptions = [
    "Full-time",
    "Part-time",
    "Contract",
    "Temporary",
    "Internship"
  ];

  return (
    <section className="mb-1">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-md shadow-md overflow-hidden border border-gray-700 p-1">
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center pr-2">
            <span className="text-xs font-medium bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
              Filters
            </span>
          </div>
          
          <div className="flex flex-wrap gap-1 items-center flex-1">
            {/* Experience Level Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  className="h-6 px-2 py-0 text-xs justify-between border-gray-700 bg-gray-800/60 text-gray-200 hover:bg-gray-700 hover:text-white"
                >
                  Exp
                  <span className="ml-1 rounded-full bg-cyan-600 px-1.5 py-0 text-[10px]">
                    {filters.experienceLevels.length || "All"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0 bg-gray-800 border-gray-700 text-gray-200">
                <ScrollArea className="h-40 p-2">
                  <div className="space-y-1">
                    {experienceLevelOptions.map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`exp-${level.replace(/\s+/g, '-').toLowerCase()}`}
                          checked={filters.experienceLevels.includes(level)}
                          onCheckedChange={(checked) => 
                            handleFilterChange("experienceLevels", level, checked === true)
                          }
                        />
                        <label 
                          htmlFor={`exp-${level.replace(/\s+/g, '-').toLowerCase()}`}
                          className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {level}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Location Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  className="h-6 px-2 py-0 text-xs justify-between border-gray-700 bg-gray-800/60 text-gray-200 hover:bg-gray-700 hover:text-white"
                >
                  Location
                  <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0 text-[10px]">
                    {filters.locations.length || "All"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0 bg-gray-800 border-gray-700 text-gray-200">
                <ScrollArea className="h-40 p-2">
                  <div className="space-y-1">
                    {locations.map((location) => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`loc-${location.replace(/\s+/g, '-').toLowerCase()}`}
                          checked={filters.locations.includes(location)}
                          onCheckedChange={(checked) => 
                            handleFilterChange("locations", location, checked === true)
                          }
                        />
                        <label 
                          htmlFor={`loc-${location.replace(/\s+/g, '-').toLowerCase()}`}
                          className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {location}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Industry Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  className="h-6 px-2 py-0 text-xs justify-between border-gray-700 bg-gray-800/60 text-gray-200 hover:bg-gray-700 hover:text-white"
                >
                  Industry
                  <span className="ml-1 rounded-full bg-purple-600 px-1.5 py-0 text-[10px]">
                    {filters.industries.length || "All"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0 bg-gray-800 border-gray-700 text-gray-200">
                <ScrollArea className="h-40 p-2">
                  <div className="space-y-1">
                    {industryOptions.map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`ind-${industry.replace(/\s+/g, '-').toLowerCase()}`}
                          checked={filters.industries.includes(industry)}
                          onCheckedChange={(checked) => 
                            handleFilterChange("industries", industry, checked === true)
                          }
                        />
                        <label 
                          htmlFor={`ind-${industry.replace(/\s+/g, '-').toLowerCase()}`}
                          className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {industry}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Employment Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  className="h-6 px-2 py-0 text-xs justify-between border-gray-700 bg-gray-800/60 text-gray-200 hover:bg-gray-700 hover:text-white"
                >
                  Type
                  <span className="ml-1 rounded-full bg-orange-600 px-1.5 py-0 text-[10px]">
                    {filters.employmentTypes.length || "All"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0 bg-gray-800 border-gray-700 text-gray-200">
                <ScrollArea className="h-40 p-2">
                  <div className="space-y-1">
                    {employmentTypeOptions.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`type-${type.replace(/\s+/g, '-').toLowerCase()}`}
                          checked={filters.employmentTypes.includes(type)}
                          onCheckedChange={(checked) => 
                            handleFilterChange("employmentTypes", type, checked === true)
                          }
                        />
                        <label 
                          htmlFor={`type-${type.replace(/\s+/g, '-').toLowerCase()}`}
                          className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 ml-auto">
            <Button
              disabled={isLoading}
              size="sm"
              variant="ghost"
              onClick={handleClearFilters}
              className="h-6 px-2 py-0 text-xs border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              Clear
            </Button>
            <Button
              disabled={isLoading}
              size="sm"
              onClick={handleApplyFilters}
              className="h-6 px-2 py-0 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white"
            >
              Apply
            </Button>
          </div>
        </div>
        
        {/* Active filters display (condensed inline) */}
        {(filters.experienceLevels.length > 0 || filters.locations.length > 0 || 
          filters.industries.length > 0 || filters.employmentTypes.length > 0) && (
          <div className="mt-1 pl-1">
            <div className="flex flex-wrap gap-1 text-[10px]">
              {filters.experienceLevels.map(level => (
                <Badge key={`exp-${level}`} variant="outline" 
                  className="px-1 py-0 h-4 text-[10px] bg-blue-900/30 text-blue-300 border-blue-700 flex items-center gap-1">
                  <span>Exp: {level}</span>
                  <X 
                    className="h-2 w-2 cursor-pointer" 
                    onClick={() => removeFilter("experienceLevels", level)}
                  />
                </Badge>
              ))}
              
              {filters.locations.map(location => (
                <Badge key={`loc-${location}`} variant="outline" 
                  className="px-1 py-0 h-4 text-[10px] bg-emerald-900/30 text-emerald-300 border-emerald-700 flex items-center gap-1">
                  <span>Loc: {location}</span>
                  <X 
                    className="h-2 w-2 cursor-pointer" 
                    onClick={() => removeFilter("locations", location)}
                  />
                </Badge>
              ))}
              
              {filters.industries.map(industry => (
                <Badge key={`ind-${industry}`} variant="outline" 
                  className="px-1 py-0 h-4 text-[10px] bg-purple-900/30 text-purple-300 border-purple-700 flex items-center gap-1">
                  <span>Ind: {industry}</span>
                  <X 
                    className="h-2 w-2 cursor-pointer" 
                    onClick={() => removeFilter("industries", industry)}
                  />
                </Badge>
              ))}
              
              {filters.employmentTypes.map(type => (
                <Badge key={`type-${type}`} variant="outline" 
                  className="px-1 py-0 h-4 text-[10px] bg-orange-900/30 text-orange-300 border-orange-700 flex items-center gap-1">
                  <span>Type: {type}</span>
                  <X 
                    className="h-2 w-2 cursor-pointer" 
                    onClick={() => removeFilter("employmentTypes", type)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
