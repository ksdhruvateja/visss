import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { GroupedBarData } from '@/types';
import { formatCurrency } from "@/lib/utils/data";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFilterContext } from '@/contexts/FilterContext';

interface SalaryLocationIndustryBarChartProps {
  data: GroupedBarData | undefined;
  isLoading: boolean;
}

export default function SalaryLocationIndustryBarChart({ data, isLoading }: SalaryLocationIndustryBarChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [activeIndustries, setActiveIndustries] = useState<string[]>([]);
  const { filters, setFilters, activeItem, setActiveItem } = useFilterContext();

  // Set top 3 industries as active by default once data loads
  useEffect(() => {
    if (!isLoading && data && data.industries && data.industries.length > 0) {
      // If activeIndustries is empty, set default industries
      if (activeIndustries.length === 0) {
        // If there are filtered industries, use those
        if (filters.industries.length > 0) {
          const filteredIndustries = filters.industries.filter(ind => 
            data.industries.includes(ind)
          );
          setActiveIndustries(filteredIndustries);
        } else {
          // Otherwise, sort industries by average salary across all locations
          const industryTotals = data.industries.map(industry => {
            let total = 0;
            let count = 0;

            data.locations.forEach(location => {
              if (data.data[location] && data.data[location][industry] > 0) {
                total += data.data[location][industry];
                count++;
              }
            });

            return {
              industry,
              avgSalary: count > 0 ? total / count : 0
            };
          });

          const topIndustries = industryTotals
            .sort((a, b) => b.avgSalary - a.avgSalary)
            .slice(0, 3)
            .map(item => item.industry);

          setActiveIndustries(topIndustries);
        }
      }
    }
  }, [data, isLoading, activeIndustries, filters.industries]);

  // Highlight industries based on active item in other charts
  useEffect(() => {
    if (activeItem.type === 'industry' && activeItem.value && data?.industries.includes(activeItem.value)) {
      if (!activeIndustries.includes(activeItem.value)) {
        setActiveIndustries(prev => [...prev, activeItem.value as string]);
      }
    }
  }, [activeItem, data?.industries, activeIndustries]);

  // Industry colors with futuristic gradient palette
  const getIndustryColor = (industry: string, isActive: boolean) => {
    const colors: Record<string, string> = {
      Technology: isActive ? '#3B82F6' : '#93C5FD',
      Healthcare: isActive ? '#10B981' : '#6EE7B7',
      Finance: isActive ? '#8B5CF6' : '#C4B5FD',
      Retail: isActive ? '#EC4899' : '#F9A8D4',
      Manufacturing: isActive ? '#F59E0B' : '#FCD34D',
      Energy: isActive ? '#EF4444' : '#FCA5A5',
      Education: isActive ? '#06B6D4' : '#67E8F9',
      Government: isActive ? '#6366F1' : '#A5B4FC',
      Logistics: isActive ? '#14B8A6' : '#5EEAD4',
      Telecommunication: isActive ? '#7C3AED' : '#C4B5FD',
      Entertainment: isActive ? '#F97316' : '#FDBA74'
    };

    return colors[industry] || (isActive ? '#6B7280' : '#D1D5DB');
  };

  useEffect(() => {
    if (isLoading || !data || !data.locations || !data.locations.length || !data.industries || !activeIndustries.length) return;

    // Clear any existing visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set up dimensions and margins
    const margin = { top: 30, right: 120, bottom: 90, left: 70 };
    const width = svgRef.current!.clientWidth - margin.left - margin.right;
    const height = svgRef.current!.clientHeight - margin.top - margin.bottom;

    // Create the SVG container
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Don't filter industries - we'll show all of them but with different styling
    const filteredLocations = data.locations.slice(0, 10); // Limit to top 10 locations for readability
    
    // Use all industries for domain to maintain consistent bar positions
    // This is crucial - we want to keep showing all industries but highlight the active ones
    const allIndustries = data.industries;
    
    // Create the X scale
    const x0 = d3.scaleBand()
      .domain(filteredLocations)
      .rangeRound([0, width])
      .paddingInner(0.1);

    const x1 = d3.scaleBand()
      .domain(allIndustries) // Use all industries, not just active ones
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    // Find max salary for Y scale across ALL industries for stable scaling
    let maxSalary = 0;
    filteredLocations.forEach(location => {
      allIndustries.forEach(industry => {
        if (data.data[location] && data.data[location][industry]) {
          maxSalary = Math.max(maxSalary, data.data[location][industry] || 0);
        }
      });
    });

    // Add a 10% padding to the max
    maxSalary *= 1.1;

    // Create the Y scale
    const y = d3.scaleLinear()
      .domain([0, maxSalary])
      .range([height, 0]);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x0))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px');

    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => formatCurrency(+d)));

    // Add title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#ffffff')
      .text('Average Salary by Location and Industry');

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Create the grouped bars for ALL industries
    filteredLocations.forEach(location => {
      allIndustries.forEach(industry => {
        if (data.data[location] && data.data[location][industry]) {
          const isActive = activeIndustries.includes(industry);
          
          g.append('rect')
            .attr('x', x0(location)! + x1(industry)!)
            .attr('y', y(data.data[location][industry] || 0))
            .attr('width', x1.bandwidth())
            .attr('height', height - y(data.data[location][industry] || 0))
            .attr('fill', getIndustryColor(industry, isActive))
            .attr('rx', 2) // Rounded corners for futuristic look
            .attr('ry', 2)
            .attr('opacity', isActive ? 1 : 0.3) // Fade out inactive industries
            .style('filter', isActive ? 
              'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))' : 'none') // Subtle shadow for active only
            .on('mouseover', function() {
              d3.select(this)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))')
                .transition()
                .duration(200)
                .attr('opacity', 0.9);

              // Notify other charts about hover
              setActiveItem({ 
                type: 'industry', 
                value: industry 
              });

              tooltip
                .style('opacity', 1)
                .html(`
                  <div class="font-medium">${location}</div>
                  <div>${industry}</div>
                  <div class="font-bold">${formatCurrency(data.data[location][industry] || 0)}</div>
                `);
            })
            .on('mousemove', function(event) {
              tooltip
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 20}px`);
            })
            .on('mouseout', function() {
              d3.select(this)
                .attr('stroke', 'none')
                .style('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))')
                .transition()
                .duration(200)
                .attr('opacity', 1);

              // Reset active item when not hovering
              setActiveItem({ type: null, value: null });

              tooltip.style('opacity', 0);
            });
        }
      });
    });

    // Add legend with ALL industries, but style based on selection
    const legend = g.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(allIndustries)
      .enter().append('g')
      .attr('transform', (d, i) => `translate(${width + 10},${i * 20})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        // Use a directly simplified version to avoid any potential issues
        const newActiveIndustries = activeIndustries.includes(d)
          ? activeIndustries.filter(i => i !== d) // Remove if present
          : [...activeIndustries, d]; // Add if not present
        
        setActiveIndustries(newActiveIndustries);
        
        // Also update global filters
        if (filters.industries.includes(d)) {
          // Remove if present
          setFilters({
            ...filters,
            industries: filters.industries.filter(industry => industry !== d)
          });
        } else {
          // Add if not present
          setFilters({
            ...filters,
            industries: [...filters.industries, d]
          });
        }
      });

    legend.append('rect')
      .attr('x', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', d => getIndustryColor(d, activeIndustries.includes(d)))
      .attr('opacity', d => activeIndustries.includes(d) ? 1 : 0.3);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 7.5)
      .attr('dy', '0.32em')
      .attr('fill', d => activeIndustries.includes(d) ? '#ffffff' : '#9ca3af')
      .text(d => d + (activeIndustries.includes(d) ? ' ✓' : ''));

    // Add responsive resize handler
    const handleResize = () => {
      // This would normally redraw the chart on resize
      // For simplicity, we'll just reload the component
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, isLoading, activeIndustries]);

  const toggleIndustry = (industry: string) => {
    // Update local chart state - always toggle the clicked industry
    const newActiveIndustries = activeIndustries.includes(industry)
      ? activeIndustries.filter(i => i !== industry) // Remove if present
      : [...activeIndustries, industry]; // Add if not present
    
    setActiveIndustries(newActiveIndustries);

    // Update global filter context to match exactly
    const newIndustryFilters = filters.industries.includes(industry)
      ? filters.industries.filter(i => i !== industry) // Remove if present
      : [...filters.industries, industry]; // Add if not present
    
    setFilters({
      ...filters,
      industries: newIndustryFilters
    });

    // Update active item state for cross-chart highlighting
    if (newActiveIndustries.includes(industry) && !activeIndustries.includes(industry)) {
      // Highlight this industry when it's newly added
      setActiveItem({ type: 'industry', value: industry });
    } else if (activeItem.type === 'industry' && activeItem.value === industry) {
      // Clear active item if it's the same industry being removed
      setActiveItem({ type: null, value: null });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <Skeleton className="h-5 w-1/3 bg-gray-700" />
        </div>
        <div className="p-2 flex-grow">
          <div className="flex flex-wrap gap-1 mb-2">
            <Skeleton className="h-5 w-16 bg-gray-700" />
            <Skeleton className="h-5 w-24 bg-gray-700" />
            <Skeleton className="h-5 w-20 bg-gray-700" />
          </div>
          <Skeleton className="h-full w-full bg-gray-700/50 rounded" />
        </div>
      </div>
    );
  }

  // Handle the case when data or industries is undefined
  if (!data || !data.industries) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400">Salary by Location & Industry</h3>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-red-400 text-sm mb-1">No Data Available</div>
            <p className="text-gray-500 text-xs">Try adjusting your filters</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
      <div className="p-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
          Salary by Location & Industry
        </h3>
      </div>
      <div className="p-2 flex-grow flex flex-col">
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              Selected: {activeIndustries.length || 'None'} 
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-2 py-0 text-xs text-gray-400 hover:text-white"
                onClick={() => {
                  // Update local state
                  setActiveIndustries(data.industries);
                  // Update global filters to match
                  setFilters({
                    ...filters,
                    industries: data.industries
                  });
                }}
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-2 py-0 text-xs text-gray-400 hover:text-white"
                onClick={() => {
                  // Update local state
                  setActiveIndustries([]);
                  // Update global filters to match
                  setFilters({
                    ...filters,
                    industries: []
                  });
                  // Clear active item
                  setActiveItem({ type: null, value: null });
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto w-full">
            {data.industries.map(industry => (
              <Badge
                key={industry}
                variant="outline"
                className={`cursor-pointer transition-all duration-200 text-xs py-0 h-5 ${
                  activeIndustries.includes(industry)
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white border-transparent'
                    : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500'
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  
                  // Always handle as multi-select regardless of key modifiers
                  // This allows for a more consistent UI behavior
                  const newActiveIndustries = activeIndustries.includes(industry)
                    ? activeIndustries.filter(i => i !== industry) // Remove if present
                    : [...activeIndustries, industry]; // Add if not present
                  
                  setActiveIndustries(newActiveIndustries);
                  
                  // Update global filters to match exactly
                  if (filters.industries.includes(industry)) {
                    // Remove if present
                    setFilters({
                      ...filters,
                      industries: filters.industries.filter(industry2 => industry2 !== industry)
                    });
                  } else {
                    // Add if not present
                    setFilters({
                      ...filters,
                      industries: [...filters.industries, industry]
                    });
                  }
                  
                  // Update the active item state for cross-chart highlighting
                  if (newActiveIndustries.includes(industry) && !activeIndustries.includes(industry)) {
                    setActiveItem({ type: 'industry', value: industry });
                  } else if (activeItem.type === 'industry' && activeItem.value === industry) {
                    setActiveItem({ type: null, value: null });
                  }
                }}
              >
                {industry}
                {activeIndustries.includes(industry) && (
                  <span className="ml-1">✓</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
        <div className="relative flex-grow">
          <svg 
            ref={svgRef} 
            width="100%" 
            height="100%" 
            preserveAspectRatio="xMidYMid meet"
            className="bg-gray-800/30 rounded overflow-visible"
            style={{ maxHeight: '100%', maxWidth: '100%' }}
          ></svg>
          <div 
            ref={tooltipRef}
            className="absolute opacity-0 bg-gray-900 p-2 rounded shadow-xl border border-gray-700 text-xs pointer-events-none z-10 text-white"
          ></div>
        </div>
      </div>
    </div>
  );
}