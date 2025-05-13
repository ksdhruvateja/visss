import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { BoxPlotData, JobListing } from '@/types';
import { formatCurrency } from "@/lib/utils/data";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface SalaryExperienceBoxPlotProps {
  data: BoxPlotData | undefined;
  isLoading: boolean;
}

export default function SalaryExperienceBoxPlot({ data, isLoading }: SalaryExperienceBoxPlotProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<'Outliers' | 'Quartiles' | 'Median'>('Outliers');

  useEffect(() => {
    if (isLoading || !data || !data.experienceLevels.length) return;

    // Clear any existing visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Set up dimensions and margins
    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = svgRef.current!.clientWidth - margin.left - margin.right;
    const height = svgRef.current!.clientHeight - margin.top - margin.bottom;

    // Create the SVG container
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create the X scale
    const x = d3.scaleBand()
      .domain(data.experienceLevels)
      .range([0, width])
      .paddingInner(0.3)
      .paddingOuter(0.2);

    // Find min and max salary across all experience levels
    let minSalary = Infinity;
    let maxSalary = -Infinity;

    data.experienceLevels.forEach(level => {
      const stats = data.salaries[level];
      minSalary = Math.min(minSalary, stats.min);
      maxSalary = Math.max(maxSalary, stats.max);
      
      // Also check outliers
      stats.outliers.forEach(outlier => {
        minSalary = Math.min(minSalary, outlier.value);
        maxSalary = Math.max(maxSalary, outlier.value);
      });
    });

    // Add a 10% padding to the min and max
    const yPadding = (maxSalary - minSalary) * 0.1;
    
    // Create the Y scale
    const y = d3.scaleLinear()
      .domain([minSalary - yPadding, maxSalary + yPadding])
      .range([height, 0]);

    // Add X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
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
      .text('Salary Distribution by Experience Level');

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Draw the boxplots
    data.experienceLevels.forEach(level => {
      const stats = data.salaries[level];
      const boxWidth = x.bandwidth();
      const boxX = x(level)!;
      
      // Draw the box
      g.append('rect')
        .attr('x', boxX)
        .attr('y', y(stats.q3))
        .attr('width', boxWidth)
        .attr('height', y(stats.q1) - y(stats.q3))
        .attr('stroke', 'black')
        .attr('fill', '#69b3a2')
        .attr('fill-opacity', 0.3)
        .attr('stroke-width', 1)
        .on('mouseover', function() {
          tooltip
            .style('opacity', 1)
            .html(`
              <div class="font-medium">${level}</div>
              <div>Median: ${formatCurrency(stats.median)}</div>
              <div>Q1-Q3: ${formatCurrency(stats.q1)} - ${formatCurrency(stats.q3)}</div>
              <div>Range: ${formatCurrency(stats.min)} - ${formatCurrency(stats.max)}</div>
            `);
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 20}px`);
        })
        .on('mouseout', function() {
          tooltip.style('opacity', 0);
        });
      
      // Draw the median line
      g.append('line')
        .attr('x1', boxX)
        .attr('x2', boxX + boxWidth)
        .attr('y1', y(stats.median))
        .attr('y2', y(stats.median))
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .style('opacity', activeFilter === 'Median' || activeFilter === 'Quartiles' ? 1 : 0.5);
      
      // Draw the whiskers and outliers only if showing outliers or quartiles
      if (activeFilter === 'Outliers' || activeFilter === 'Quartiles') {
        // Draw the min whisker
        g.append('line')
          .attr('x1', boxX + boxWidth / 2)
          .attr('x2', boxX + boxWidth / 2)
          .attr('y1', y(stats.q1))
          .attr('y2', y(stats.min))
          .attr('stroke', 'black')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
        
        g.append('line')
          .attr('x1', boxX + boxWidth * 0.25)
          .attr('x2', boxX + boxWidth * 0.75)
          .attr('y1', y(stats.min))
          .attr('y2', y(stats.min))
          .attr('stroke', 'black')
          .attr('stroke-width', 1);
        
        // Draw the max whisker
        g.append('line')
          .attr('x1', boxX + boxWidth / 2)
          .attr('x2', boxX + boxWidth / 2)
          .attr('y1', y(stats.q3))
          .attr('y2', y(stats.max))
          .attr('stroke', 'black')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
        
        g.append('line')
          .attr('x1', boxX + boxWidth * 0.25)
          .attr('x2', boxX + boxWidth * 0.75)
          .attr('y1', y(stats.max))
          .attr('y2', y(stats.max))
          .attr('stroke', 'black')
          .attr('stroke-width', 1);
      }
      
      // Draw the outliers
      if (activeFilter === 'Outliers') {
        stats.outliers.forEach(outlier => {
          g.append('circle')
            .attr('cx', boxX + boxWidth / 2 + (Math.random() - 0.5) * boxWidth * 0.8)
            .attr('cy', y(outlier.value))
            .attr('r', 4)
            .attr('fill', 'red')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function() {
              tooltip
                .style('opacity', 1)
                .html(`
                  <div class="font-medium">${outlier.jobTitle}</div>
                  <div>${outlier.companyName}</div>
                  <div class="font-bold">${formatCurrency(outlier.value)}</div>
                  <div class="text-sm text-gray-600">(Click for details)</div>
                `);
            })
            .on('mousemove', function(event) {
              tooltip
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 20}px`);
            })
            .on('mouseout', function() {
              tooltip.style('opacity', 0);
            })
            .on('click', function() {
              // Show job details modal (could be implemented)
              console.log('Job details for:', outlier.id);
            });
        });
      }
    });

    // Add responsive resize handler
    const handleResize = () => {
      // This would normally redraw the chart on resize
      // For simplicity, we'll just reload the component
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, isLoading, activeFilter]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700 flex items-center justify-between">
          <Skeleton className="h-5 w-1/3 bg-gray-700" />
          <div className="flex items-center space-x-1">
            <Skeleton className="h-5 w-14 bg-gray-700" />
            <Skeleton className="h-5 w-14 bg-gray-700" />
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
  if (!data || !data.experienceLevels || data.experienceLevels.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400">Salary by Experience</h3>
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
          Salary by Experience
        </h3>
        
        <div className="flex items-center space-x-1">
          <Button 
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${activeFilter === 'Median' ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveFilter('Median')}
          >
            Median
          </Button>
          <Button 
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${activeFilter === 'Quartiles' ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveFilter('Quartiles')}
          >
            Quartiles
          </Button>
          <Button 
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${activeFilter === 'Outliers' ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400'}`}
            onClick={() => setActiveFilter('Outliers')}
          >
            Outliers
          </Button>
        </div>
      </div>
      <div className="p-2 flex-grow">
        <div className="relative w-full h-full">
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
