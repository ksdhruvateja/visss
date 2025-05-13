import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ScatterPlotData } from '@/types';
import { formatCurrency, formatDate } from "@/lib/utils/data";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useFilterContext } from '@/contexts/FilterContext';

interface SalaryPostingDateScatterProps {
  data: ScatterPlotData | undefined;
  isLoading: boolean;
}

export default function SalaryPostingDateScatter({ data, isLoading }: SalaryPostingDateScatterProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [groupByIndustry, setGroupByIndustry] = useState(true); // Set to true by default
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const { filters, setFilters, activeItem, setActiveItem } = useFilterContext();

  useEffect(() => {
    if (isLoading || !data || !data.points.length) return;

    // Clear any existing visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set up dimensions and margins - increased left margin for better label visibility
    const margin = { top: 30, right: 30, bottom: 50, left: 90 };
    const width = svgRef.current!.clientWidth - margin.left - margin.right;
    const height = svgRef.current!.clientHeight - margin.top - margin.bottom;

    // Create the SVG container
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const dateValues = data.points.map(d => parseDate(d.date.split('T')[0])!);
    const salaryValues = data.points.map(d => d.salary);

    // Create the X scale (time)
    const x = d3.scaleTime()
      .domain(d3.extent(dateValues) as [Date, Date])
      .range([0, width]);

    // Create the Y scale (salary)
    const y = d3.scaleLinear()
      .domain([0, d3.max(salaryValues) as number * 1.1])
      .range([height, 0]);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#e2e8f0'); // Light color for better visibility
      
    // Style the axis lines  
    g.selectAll('.domain, .tick line')
      .style('stroke', '#4b5563');

    // Add Y axis with fewer ticks to prevent overlapping
    g.append('g')
      .call(d3.axisLeft(y)
        .tickFormat(d => formatCurrency(+d))
        .ticks(6)) // Reduce number of ticks to prevent overlap
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#e2e8f0'); // Light color for better visibility

    // Add X axis label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Posting Date');

    // Add Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Salary (USD)');

    // Add title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Correlation Between Salary and Posting Date');

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Create color scale for industries if grouping by industry
    const industries = [...new Set(data.points.map(d => d.industry))];
    const colorScale = d3.scaleOrdinal<string>()
      .domain(industries)
      .range(d3.schemeCategory10);

    // Filter points by selected industry if one is selected
    const filteredPoints = selectedIndustry 
      ? data.points.filter(d => d.industry === selectedIndustry)
      : data.points;
    
    // Add the scatter plot points
    g.selectAll('circle')
      .data(filteredPoints)
      .enter()
      .append('circle')
      .attr('cx', d => x(parseDate(d.date.split('T')[0])!))
      .attr('cy', d => y(d.salary))
      .attr('r', 4)
      .attr('fill', d => groupByIndustry ? colorScale(d.industry) : 'steelblue')
      .attr('opacity', 0.7)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        // Update active item in filter context
        setActiveItem({ type: 'industry', value: d.industry });
        
        d3.select(this)
          .attr('r', 6)
          .attr('stroke', '#000')
          .attr('stroke-width', 1);
          
        tooltip
          .style('opacity', 1)
          .html(`
            <div class="font-medium">${d.jobTitle}</div>
            <div>${d.companyName}</div>
            <div>Industry: ${d.industry}</div>
            <div>Salary: ${formatCurrency(d.salary)}</div>
            <div>Posted: ${formatDate(d.date)}</div>
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
          .attr('r', 4)
          .attr('stroke', '#fff');
          
        tooltip.style('opacity', 0);
      });

    // Add trend line if enabled
    if (showTrendLine && data.trendLine.length === 2) {
      const trendX1 = parseDate(data.trendLine[0].date.split('T')[0])!;
      const trendY1 = data.trendLine[0].salary;
      const trendX2 = parseDate(data.trendLine[1].date.split('T')[0])!;
      const trendY2 = data.trendLine[1].salary;
      
      g.append('line')
        .attr('x1', x(trendX1))
        .attr('y1', y(trendY1))
        .attr('x2', x(trendX2))
        .attr('y2', y(trendY2))
        .attr('stroke', 'red')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
    }

    // Add legend if grouping by industry
    if (groupByIndustry) {
      const legend = g.append('g')
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
        .attr('text-anchor', 'start')
        .selectAll('g')
        .data(industries.slice(0, 10)) // Limit to top 10 for space
        .enter().append('g')
        .attr('transform', (d, i) => `translate(${width - 100},${i * 20})`)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
          // Toggle industry selection
          if (selectedIndustry === d) {
            setSelectedIndustry(null);
          } else {
            setSelectedIndustry(d);
          }
          
          // Update global filters
          const newFilters = { ...filters };
          if (selectedIndustry === d) {
            // Removing this industry filter
            newFilters.industries = newFilters.industries.filter(i => i !== d);
          } else {
            // Adding this industry filter
            if (!newFilters.industries.includes(d)) {
              newFilters.industries = [...newFilters.industries, d];
            }
          }
          setFilters(newFilters);
          
          setRedrawTrigger(prev => prev + 1);
        });

      legend.append('rect')
        .attr('x', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', d => colorScale(d))
        .attr('stroke', d => selectedIndustry === d ? 'white' : 'none')
        .attr('stroke-width', 2);

      legend.append('text')
        .attr('x', 20)
        .attr('y', 7.5)
        .attr('dy', '0.32em')
        .style('fill', '#e2e8f0') // Light color for better visibility
        .text(d => d);
    }

    // Add responsive resize handler
    const handleResize = () => {
      // This would normally redraw the chart on resize
      // For simplicity, we'll just reload the component
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, isLoading, showTrendLine, groupByIndustry, selectedIndustry, redrawTrigger]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700 flex items-center justify-between">
          <Skeleton className="h-5 w-1/3 bg-gray-700" />
          <div className="flex items-center space-x-1">
            <Skeleton className="h-5 w-14 bg-gray-700" />
          </div>
        </div>
        <div className="p-2 flex-grow">
          <Skeleton className="h-full w-full bg-gray-700/50 rounded" />
        </div>
      </div>
    );
  }

  // Handle the case when data is undefined
  if (!data || !data.points || data.points.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400">Salary vs Posting Date</h3>
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
      <div className="p-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
          Salary vs Posting Date
        </h3>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${showTrendLine ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400'}`}
            onClick={() => setShowTrendLine(!showTrendLine)}
          >
            Trend
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${groupByIndustry ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400'}`}
            onClick={() => setGroupByIndustry(!groupByIndustry)}
          >
            Group
          </Button>
        </div>
      </div>
      <div className="p-2 flex-grow flex flex-col">
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
