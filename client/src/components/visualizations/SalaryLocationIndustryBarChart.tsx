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

    // Filter the data to only include active industries
    const filteredLocations = data.locations.slice(0, 10); // Limit to top 10 locations for readability

    // Create the X scale
    const x0 = d3.scaleBand()
      .domain(filteredLocations)
      .rangeRound([0, width])
      .paddingInner(0.1);

    const x1 = d3.scaleBand()
      .domain(activeIndustries)
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    // Find max salary for Y scale
    let maxSalary = 0;
    filteredLocations.forEach(location => {
      activeIndustries.forEach(industry => {
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

    // Create the grouped bars
    filteredLocations.forEach(location => {
      activeIndustries.forEach(industry => {
        if (data.data[location] && data.data[location][industry]) {
          g.append('rect')
            .attr('x', x0(location)! + x1(industry)!)
            .attr('y', y(data.data[location][industry] || 0))
            .attr('width', x1.bandwidth())
            .attr('height', height - y(data.data[location][industry] || 0))
            .attr('fill', getIndustryColor(industry, true))
            .attr('rx', 2) // Rounded corners for futuristic look
            .attr('ry', 2)
            .style('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))') // Subtle shadow
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

    // Add legend
    const legend = g.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(activeIndustries)
      .enter().append('g')
      .attr('transform', (d, i) => `translate(${width + 10},${i * 20})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        toggleIndustry(d);
      });

    legend.append('rect')
      .attr('x', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', d => getIndustryColor(d, true));

    legend.append('text')
      .attr('x', 20)
      .attr('y', 7.5)
      .attr('dy', '0.32em')
      .text(d => d);

    // Add responsive resize handler
    const handleResize = () => {
      // This would normally redraw the chart on resize
      // For simplicity, we'll just reload the component
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, isLoading, activeIndustries]);

  const toggleIndustry = (industry: string) => {
    // Update local chart state
    setActiveIndustries(prev => {
      if (prev.includes(industry)) {
        return prev.filter(i => i !== industry);
      } else {
        return [...prev, industry];
      }
    });
    
    // Update global filter context
    if (filters.industries.includes(industry)) {
      // Remove industry from global filters
      setFilters({
        ...filters,
        industries: filters.industries.filter(i => i !== industry)
      });
      // Clear active item if it's the same industry
      if (activeItem.type === 'industry' && activeItem.value === industry) {
        setActiveItem({ type: null, value: null });
      }
    } else {
      // Add industry to global filters
      setFilters({
        ...filters,
        industries: [...filters.industries, industry]
      });
      // Set as active item to highlight in other charts
      setActiveItem({ type: 'industry', value: industry });
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
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-2 py-0 text-xs text-gray-400 hover:text-white"
              onClick={() => setActiveIndustries(data.industries)}
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-2 py-0 text-xs text-gray-400 hover:text-white"
              onClick={() => setActiveIndustries([])}
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto w-full">
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
                  if (e.ctrlKey || e.metaKey) {
                    // Add/remove single industry
                    toggleIndustry(industry);
                  } else {
                    // Set as single selection
                    setActiveIndustries([industry]);
                    setFilters({
                      ...filters,
                      industries: [industry]
                    });
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
