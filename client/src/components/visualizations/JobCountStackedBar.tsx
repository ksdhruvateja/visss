import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { StackedBarData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFilterContext } from '@/contexts/FilterContext';

interface JobCountStackedBarProps {
  data: StackedBarData | undefined;
  isLoading: boolean;
}

export default function JobCountStackedBar({ data, isLoading }: JobCountStackedBarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [activeEmploymentType, setActiveEmploymentType] = useState<string | null>(null);
  const { filters, setFilters, activeItem, setActiveItem } = useFilterContext();

  // Effect to respond to active items from other charts
  useEffect(() => {
    if (!svgRef.current || isLoading || !data || !data.industries.length) return;
    
    // If there's an active industry from another chart, highlight it
    if (activeItem.type === 'industry' && activeItem.value) {
      const industry = activeItem.value;
      
      // Find and highlight this industry's bars
      const svg = d3.select(svgRef.current);
      
      svg.selectAll('.layer')
        .style('opacity', d => {
          const layerData = d as any;
          const layerIndustry = layerData.key;
          return layerIndustry === industry ? 1 : 0.5;
        });
    } else {
      // Reset all highlights
      const svg = d3.select(svgRef.current);
      svg.selectAll('.layer')
        .style('opacity', 1);
    }
  }, [activeItem, data, isLoading]);

  useEffect(() => {
    if (isLoading || !data || !data.industries.length) return;

    // Clear any existing visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set up dimensions and margins
    const margin = { top: 30, right: 120, bottom: 90, left: 60 };
    const width = svgRef.current!.clientWidth - margin.left - margin.right;
    const height = svgRef.current!.clientHeight - margin.top - margin.bottom;

    // Create the SVG container
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Sort industries by total count
    const industriesByTotal = data.industries.map(industry => ({
      industry,
      total: data.employmentTypes.reduce((sum, type) => sum + data.data[industry][type], 0)
    })).sort((a, b) => b.total - a.total);

    const sortedIndustries = industriesByTotal.map(d => d.industry);

    // Create the X scale
    const x = d3.scaleBand()
      .domain(sortedIndustries)
      .range([0, width])
      .padding(0.3);

    // Prepare the stacked data
    const stackedData = d3.stack<string>()
      .keys(data.employmentTypes)
      .value((industry, type) => data.data[industry][type])
      (sortedIndustries);

    // Find the maximum total count
    const maxTotal = d3.max(industriesByTotal, d => d.total) || 0;

    // Create the Y scale
    const y = d3.scaleLinear()
      .domain([0, maxTotal * 1.1])
      .range([height, 0]);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px')
      .style('fill', '#e2e8f0'); // Light color for better visibility

    // Style the axis lines
    g.selectAll('.domain, .tick line')
      .style('stroke', '#4b5563');
      
    // Add Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#e2e8f0'); // Light color for better visibility

    // Add title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Job Count by Industry and Employment Type');

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Employment type colors
    const typeColors: Record<string, string> = {
      'Full-time': '#4f46e5',
      'Part-time': '#10b981',
      'Contract': '#f59e0b',
      'Temporary': '#ef4444',
      'Internship': '#8b5cf6'
    };

    // Draw the stacked bars
    stackedData.forEach((layer, i) => {
      const employmentType = data.employmentTypes[i];
      const color = typeColors[employmentType] || d3.schemeCategory10[i % 10];
      
      const isActive = activeEmploymentType === null || activeEmploymentType === employmentType;
      
      g.selectAll(`rect.${employmentType.toLowerCase().replace('-', '')}`)
        .data(layer)
        .enter()
        .append('rect')
        .attr('class', `${employmentType.toLowerCase().replace('-', '')}`)
        .attr('x', d => x(d.data)!)
        .attr('y', d => isActive ? y(d[1]) : y(d[0]))
        .attr('height', d => isActive ? y(d[0]) - y(d[1]) : 0)
        .attr('width', x.bandwidth())
        .attr('fill', color)
        .attr('opacity', isActive ? 0.8 : 0.3)
        .attr('stroke', isActive ? 'white' : 'none')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          const count = d[1] - d[0];
          const industry = d.data;
          
          // Set active item in filter context
          setActiveItem({ type: 'industry', value: industry });
          
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke', 'black');
          
          tooltip
            .style('opacity', 1)
            .html(`
              <div class="font-medium">${industry}</div>
              <div>${employmentType}: ${count} jobs</div>
              <div>Click to filter by employment type</div>
            `);
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 20}px`);
        })
        .on('mouseout', function() {
          // Reset active item in filter context
          setActiveItem({ type: null, value: null });
          
          d3.select(this)
            .attr('opacity', isActive ? 0.8 : 0.3)
            .attr('stroke', isActive ? 'white' : 'none');
          
          tooltip.style('opacity', 0);
        })
        .on('click', function() {
          // Update local state
          setActiveEmploymentType(activeEmploymentType === employmentType ? null : employmentType);
          
          // Update global filters
          const newFilters = { ...filters };
          if (activeEmploymentType === employmentType) {
            // Removing this employment type filter
            newFilters.employmentTypes = newFilters.employmentTypes.filter(t => t !== employmentType);
          } else {
            // Adding this employment type filter
            if (!newFilters.employmentTypes.includes(employmentType)) {
              newFilters.employmentTypes = [...newFilters.employmentTypes, employmentType];
            }
          }
          setFilters(newFilters);
        });
    });

    // Add legend
    const legend = g.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(data.employmentTypes)
      .enter().append('g')
      .attr('transform', (d, i) => `translate(${width + 10},${i * 20})`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        // Update local state
        setActiveEmploymentType(activeEmploymentType === d ? null : d);
        
        // Update global filters
        const newFilters = { ...filters };
        if (activeEmploymentType === d) {
          // Removing this employment type filter
          newFilters.employmentTypes = newFilters.employmentTypes.filter(t => t !== d);
        } else {
          // Adding this employment type filter
          if (!newFilters.employmentTypes.includes(d)) {
            newFilters.employmentTypes = [...newFilters.employmentTypes, d];
          }
        }
        setFilters(newFilters);
      });

    legend.append('rect')
      .attr('x', 0)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => typeColors[d] || d3.schemeCategory10[data.employmentTypes.indexOf(d) % 10])
      .attr('opacity', d => activeEmploymentType === null || activeEmploymentType === d ? 0.8 : 0.3);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 7.5)
      .attr('dy', '0.32em')
      .style('fill', '#e2e8f0') // Light color for better visibility
      .text(d => d);

    // Add responsive resize handler
    const handleResize = () => {
      // This would normally redraw the chart on resize
      // For simplicity, we'll just reload the component
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, isLoading, activeEmploymentType]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <Skeleton className="h-5 w-1/3 bg-gray-700" />
        </div>
        <div className="p-2 flex-grow">
          <div className="flex gap-1 mb-2">
            <Skeleton className="h-5 w-16 bg-gray-700" />
            <Skeleton className="h-5 w-24 bg-gray-700" />
          </div>
          <Skeleton className="h-full w-full bg-gray-700/50 rounded" />
        </div>
      </div>
    );
  }

  // Handle the case when data is undefined
  if (!data || !data.industries || data.industries.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400">Job Counts by Industry</h3>
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
          Job Counts by Industry
        </h3>
      </div>
      <div className="p-2 flex-grow flex flex-col">
        <div className="flex items-center gap-1 mb-2">
          <Button 
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${activeEmploymentType === null ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveEmploymentType(null)}
          >
            All Types
          </Button>
          <Button 
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${activeEmploymentType !== null ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveEmploymentType(activeEmploymentType === null ? 'Full-time' : activeEmploymentType)}
          >
            By Type
          </Button>
        </div>
        <div className="relative flex-grow">
          <svg 
            ref={svgRef} 
            width="100%" 
            height="100%" 
            className="bg-gray-800/30 rounded"
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
