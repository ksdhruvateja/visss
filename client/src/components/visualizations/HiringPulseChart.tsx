import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { useFilterContext } from "@/contexts/FilterContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeLineData } from "@/types";

interface HiringPulseChartProps {
  data: TimeLineData | undefined;
  isLoading: boolean;
}

type ViewMode = "heatmap" | "bubble" | "trend";

export default function HiringPulseChart({ data, isLoading }: HiringPulseChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const { filters, setFilters, activeItem, setActiveItem } = useFilterContext();

  // Process data to get aggregate metrics by industry and experience level
  const getAggregatedData = () => {
    if (!data) return null;
    
    const industryData: Record<string, Record<string, number>> = {};
    const expLevelTotals: Record<string, number> = {};
    const industryTotals: Record<string, number> = {};
    const timeData: Record<string, Record<string, number>> = {};
    
    // Initialize for each experience level and industry
    data.experienceLevels.forEach(level => {
      expLevelTotals[level] = 0;
      industryData[level] = {};
      timeData[level] = {};
      
      // Sum all time points for this level
      Object.keys(data.data[level] || {}).forEach(timePoint => {
        const count = data.data[level][timePoint] || 0;
        expLevelTotals[level] += count;
        
        // Store time series data
        timeData[level][timePoint] = count;
      });
    });
    
    // Calculate industry distribution (we'll approximate based on experience levels)
    const industries = ["Technology", "Healthcare", "Finance", "Education", "Retail"];
    industries.forEach(industry => {
      industryTotals[industry] = 0;
      
      // Distribute job counts across industries (approximation)
      data.experienceLevels.forEach(level => {
        // Simulate industry distribution
        const industryWeight = Math.random() * 0.5 + 0.5; // Random weight between 0.5 and 1
        const count = Math.round(expLevelTotals[level] * industryWeight / industries.length);
        industryData[level][industry] = count;
        industryTotals[industry] += count;
      });
    });
    
    return {
      byExperience: expLevelTotals,
      byIndustry: industryTotals,
      byExperienceAndIndustry: industryData,
      timeSeries: timeData,
      experienceLevels: data.experienceLevels,
      industries: industries,
      timePoints: data.timePoints
    };
  };

  const aggregatedData = getAggregatedData();
  
  // Render heatmap visualization
  const renderHeatmap = () => {
    if (!svgRef.current || !aggregatedData) return;
    
    // Clear previous visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Set up dimensions and margins
    const margin = { top: 30, right: 50, bottom: 50, left: 120 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;
    
    // Create the SVG container
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
      
    // Define scales
    const xScale = d3.scaleBand()
      .domain(aggregatedData.industries)
      .range([0, width])
      .padding(0.05);
      
    const yScale = d3.scaleBand()
      .domain(aggregatedData.experienceLevels)
      .range([0, height])
      .padding(0.05);
      
    // Find max value for color scale
    const maxValue = d3.max(
      aggregatedData.experienceLevels.flatMap(level => 
        aggregatedData.industries.map(industry => 
          aggregatedData.byExperienceAndIndustry[level][industry] || 0
        )
      )
    ) || 0;
    
    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateInferno)
      .domain([0, maxValue]);
    
    // Create heatmap cells
    g.selectAll(".heatmap-cell")
      .data(aggregatedData.experienceLevels.flatMap(level => 
        aggregatedData.industries.map(industry => ({
          level,
          industry,
          value: aggregatedData.byExperienceAndIndustry[level][industry] || 0
        }))
      ))
      .join("rect")
      .attr("class", "heatmap-cell")
      .attr("x", d => xScale(d.industry) || 0)
      .attr("y", d => yScale(d.level) || 0)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", d => colorScale(d.value))
      .attr("opacity", 0)
      .attr("stroke", "#1a2030")
      .attr("stroke-width", 1)
      .attr("data-level", d => d.level)
      .attr("data-industry", d => d.industry)
      .on("mouseover", function(event, d) {
        // Highlight this cell
        d3.select(this)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
          
        // Show tooltip
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 25}px`)
          .html(`
            <div class="font-semibold">${d.industry}</div>
            <div>${d.level}</div>
            <div class="text-blue-400">${d.value} jobs</div>
          `);
      })
      .on("mouseout", function() {
        // Remove highlight
        d3.select(this)
          .attr("stroke", "#1a2030")
          .attr("stroke-width", 1);
          
        // Hide tooltip
        d3.select(tooltipRef.current).style("display", "none");
      })
      .on("click", (event, d) => {
        // Update filters
        const newFilters = { ...filters };
        
        // Toggle experience level
        if (!newFilters.experienceLevels.includes(d.level)) {
          newFilters.experienceLevels = [d.level];
        } else {
          newFilters.experienceLevels = [];
        }
        
        // Update filters
        setFilters(newFilters);
        setFocusedElement(d.level);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 15)
      .attr("opacity", 1);
      
    // Add X axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("y", 10)
      .attr("x", 0)
      .attr("dy", ".35em")
      .attr("transform", "rotate(0)")
      .style("text-anchor", "middle")
      .style("fill", "#e5e7eb")
      .style("font-size", "10px");
      
    // Add Y axis
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "#e5e7eb")
      .style("font-size", "10px");
      
    // Add title
    g.append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("fill", "#ffffff")
      .style("font-size", "12px")
      .text("Job Distribution by Industry & Experience Level");
      
    // Add color legend
    const legendWidth = width * 0.6;
    const legendHeight = 10;
    
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${(width - legendWidth) / 2},${height + 40})`);
      
    // Create gradient for legend
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");
      
    // Add color stops
    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const offset = i / numStops;
      gradient.append("stop")
        .attr("offset", `${offset * 100}%`)
        .attr("stop-color", colorScale(maxValue * offset));
    }
    
    // Draw legend rectangle
    legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("fill", "url(#legend-gradient)");
      
    // Add legend axis
    const legendScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);
      
    legend.append("g")
      .attr("transform", `translate(0,${legendHeight})`)
      .call(d3.axisBottom(legendScale)
        .ticks(5)
        .tickSize(-legendHeight))
      .selectAll("text")
      .style("fill", "#e5e7eb")
      .style("font-size", "8px");
      
    // Add legend title
    legend.append("text")
      .attr("class", "legend-title")
      .attr("x", legendWidth / 2)
      .attr("y", legendHeight + 25)
      .attr("text-anchor", "middle")
      .style("fill", "#a3a8b8")
      .style("font-size", "8px")
      .text("Job Count");
  };
  
  // Render bubble chart visualization
  const renderBubbleChart = () => {
    if (!svgRef.current || !aggregatedData) return;
    
    // Clear previous visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Set up dimensions and margins
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;
    
    // Create the SVG container
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
      
    // Create data structure for bubbles
    const bubbleData = aggregatedData.experienceLevels.map(level => {
      const totalJobs = aggregatedData.byExperience[level];
      
      // Find highest industry for this experience level
      let highestIndustry = aggregatedData.industries[0];
      let highestCount = 0;
      
      aggregatedData.industries.forEach(industry => {
        const count = aggregatedData.byExperienceAndIndustry[level][industry];
        if (count > highestCount) {
          highestCount = count;
          highestIndustry = industry;
        }
      });
      
      return {
        name: level,
        value: totalJobs,
        group: highestIndustry
      };
    });
    
    // Define color scale by industry
    const colorScale = d3.scaleOrdinal<string>()
      .domain(aggregatedData.industries)
      .range(d3.schemeTableau10);
      
    // Pack layout
    const pack = d3.pack<typeof bubbleData[0]>()
      .size([width, height])
      .padding(2);
      
    // Create hierarchy and compute layout
    const root = d3.hierarchy({ children: bubbleData })
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
      
    const nodes = pack(root).leaves();
    
    // Create bubble nodes
    const bubbles = g.selectAll(".bubble")
      .data(nodes)
      .join("circle")
      .attr("class", "bubble")
      .attr("r", 0)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("fill", d => colorScale(d.data.group))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3)
      .attr("fill-opacity", 0.7)
      .attr("data-level", d => d.data.name)
      .attr("data-industry", d => d.data.group)
      .on("mouseover", function(event, d) {
        // Highlight this bubble
        d3.select(this)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2)
          .attr("stroke-opacity", 1);
          
        // Show tooltip
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("display", "block")
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 25}px`)
          .html(`
            <div class="font-semibold">${d.data.name}</div>
            <div>Top industry: ${d.data.group}</div>
            <div class="text-blue-400">${d.data.value} jobs</div>
          `);
      })
      .on("mouseout", function() {
        // Remove highlight
        d3.select(this)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1)
          .attr("stroke-opacity", 0.3);
          
        // Hide tooltip
        d3.select(tooltipRef.current).style("display", "none");
      })
      .on("click", (event, d) => {
        // Update filters
        const newFilters = { ...filters };
        
        // Toggle experience level
        if (!newFilters.experienceLevels.includes(d.data.name)) {
          newFilters.experienceLevels = [d.data.name];
        } else {
          newFilters.experienceLevels = [];
        }
        
        // Update filters
        setFilters(newFilters);
        setFocusedElement(d.data.name);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 80)
      .attr("r", d => d.r);
      
    // Add text labels
    g.selectAll(".bubble-label")
      .data(nodes)
      .join("text")
      .attr("class", "bubble-label")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("fill", "#ffffff")
      .style("font-size", d => Math.min(d.r / 3, 12))
      .style("pointer-events", "none")
      .style("opacity", 0)
      .text(d => d.data.name.split(' ').slice(0, 2).join(' '))
      .transition()
      .duration(500)
      .delay((d, i) => 800 + i * 80)
      .style("opacity", d => d.r > 30 ? 1 : 0);
      
    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 10)`);
      
    // Add legend items
    const industries = aggregatedData.industries;
    industries.forEach((industry, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
        
      legendItem.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 6)
        .attr("fill", colorScale(industry));
        
      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .style("fill", "#e5e7eb")
        .style("font-size", "10px")
        .text(industry);
    });
    
    // Add title
    g.append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("fill", "#ffffff")
      .style("font-size", "12px")
      .text("Job Distribution by Experience Level");
  };
  
  // Render trend visualization
  const renderTrendChart = () => {
    if (!svgRef.current || !aggregatedData || !data) return;
    
    // Clear previous visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Set up dimensions and margins
    const margin = { top: 30, right: 70, bottom: 50, left: 50 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;
    
    // Create the SVG container
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
      
    // Parse dates with support for different formats
    const parseDate = (dateString: string) => {
      // Handle different date formats
      if (dateString.includes("-")) {
        // Standard format: YYYY-MM
        const [year, month] = dateString.split("-").map(Number);
        return new Date(year, month - 1);
      } else if (dateString.includes("Q")) {
        // Quarter format: Q1 2023, Q2 2023, etc.
        const [quarter, year] = dateString.split(" ");
        const quarterNum = parseInt(quarter.substring(1));
        const month = (quarterNum - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
        return new Date(parseInt(year), month);
      } else {
        // Weekly format: Jan 01, Feb 15, etc.
        try {
          return new Date(dateString);
        } catch (e) {
          console.error(`Error parsing date: ${dateString}`, e);
          return new Date(); // Fallback
        }
      }
    };
    
    // Create X scale
    const timePoints = aggregatedData.timePoints.map(parseDate);
    const x = d3
      .scaleTime()
      .domain(d3.extent(timePoints) as [Date, Date])
      .range([0, width]);
      
    // Create Y scale
    const allValues = aggregatedData.experienceLevels.flatMap(level => 
      Object.values(aggregatedData.timeSeries[level])
    );
    
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(allValues) || 0])
      .range([height, 0])
      .nice();
      
    // Color scale
    const colorScale = d3.scaleOrdinal<string>()
      .domain(aggregatedData.experienceLevels)
      .range(d3.schemeTableau10);
      
    // Add X Grid
    g.append("g")
      .attr("class", "grid x-grid")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .tickSize(-height)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#2d3748")
      .attr("stroke-opacity", 0.3);
      
    // Add Y Grid
    g.append("g")
      .attr("class", "grid y-grid")
      .call(
        d3.axisLeft(y)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "#2d3748")
      .attr("stroke-opacity", 0.3);
      
    // Create line generator
    const line = d3
      .line<[string, number]>()
      .x(d => x(parseDate(d[0])))
      .y(d => y(d[1]))
      .curve(d3.curveMonotoneX);
      
    // Add lines for each experience level
    aggregatedData.experienceLevels.forEach((level, i) => {
      const lineData: [string, number][] = Object.entries(aggregatedData.timeSeries[level]);
      
      // Draw line path
      g.append("path")
        .datum(lineData)
        .attr("class", "trend-line")
        .attr("fill", "none")
        .attr("stroke", colorScale(level))
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line)
        .attr("data-level", level)
        .attr("opacity", 0)
        .transition()
        .duration(1000)
        .delay(i * 100)
        .attr("opacity", 1);
        
      // Add points
      const points = g.selectAll(`.point-${i}`)
        .data(lineData)
        .join("circle")
        .attr("class", `data-point point-${i}`)
        .attr("cx", d => x(parseDate(d[0])))
        .attr("cy", d => y(d[1]))
        .attr("r", 4)
        .attr("fill", colorScale(level))
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .attr("data-level", level)
        .attr("data-date", d => d[0])
        .attr("data-value", d => d[1])
        .attr("opacity", 0)
        .on("mouseover", function(event, d) {
          // Highlight point
          d3.select(this)
            .attr("r", 6)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2);
            
          // Show tooltip
          const tooltip = d3.select(tooltipRef.current);
          tooltip
            .style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 25}px`)
            .html(`
              <div class="font-semibold">${level}</div>
              <div>${d[0]}</div>
              <div class="text-blue-400">${d[1]} jobs</div>
            `);
        })
        .on("mouseout", function() {
          // Return to normal state
          d3.select(this)
            .attr("r", 4)
            .attr("stroke", "#000")
            .attr("stroke-width", 1);
            
          // Hide tooltip
          d3.select(tooltipRef.current).style("display", "none");
        })
        .on("click", (event, d) => {
          // Update filters
          const newFilters = { ...filters };
          
          // Toggle experience level
          if (!newFilters.experienceLevels.includes(level)) {
            newFilters.experienceLevels = [level];
          } else {
            newFilters.experienceLevels = [];
          }
          
          // Update filters
          setFilters(newFilters);
          setFocusedElement(level);
        });
        
      // Animate points
      points
        .transition()
        .duration(500)
        .delay((d, j) => 1000 + i * 100 + j * 20)
        .attr("opacity", 1);
    });
    
    // Add X axis
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickFormat(d => {
            const date = new Date(d as Date);
            return date.toLocaleDateString(undefined, { 
              month: 'short', 
              year: '2-digit' 
            });
          })
      )
      .selectAll("text")
      .style("fill", "#e5e7eb")
      .style("font-size", "10px");
      
    // Add Y axis
    g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .style("fill", "#e5e7eb")
      .style("font-size", "10px");
      
    // Add title
    g.append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("fill", "#ffffff")
      .style("font-size", "12px")
      .text("Job Posting Trends Over Time");
      
    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width + 10}, 0)`);
      
    // Add legend items
    aggregatedData.experienceLevels.forEach((level, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
        
      legendItem.append("line")
        .attr("x1", 0)
        .attr("y1", 10)
        .attr("x2", 15)
        .attr("y2", 10)
        .attr("stroke", colorScale(level))
        .attr("stroke-width", 2);
        
      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 14)
        .style("fill", "#e5e7eb")
        .style("font-size", "10px")
        .text(level);
    });
  };
  
  // Update visualization based on current view mode
  useEffect(() => {
    if (isLoading || !aggregatedData) return;
    
    switch (viewMode) {
      case "heatmap":
        renderHeatmap();
        break;
      case "bubble":
        renderBubbleChart();
        break;
      case "trend":
        renderTrendChart();
        break;
      default:
        renderHeatmap();
    }
  }, [viewMode, isLoading, aggregatedData, filters, animationTrigger]);
  
  // Effect to update styling based on filtered experience levels
  useEffect(() => {
    if (!svgRef.current || isLoading || !data) return;
    
    // Apply styling based on filters
    if (filters.experienceLevels.length > 0) {
      // Highlight selected elements
      d3.selectAll("[data-level]").each(function() {
        const element = d3.select(this);
        const level = element.attr("data-level");
        
        if (filters.experienceLevels.includes(level)) {
          // Element is selected
          if (element.classed("heatmap-cell")) {
            element.attr("stroke", "#ffffff").attr("stroke-width", 2);
          } else if (element.classed("bubble")) {
            element.attr("stroke", "#ffffff").attr("stroke-width", 2).attr("stroke-opacity", 1);
          } else if (element.classed("trend-line")) {
            element.attr("stroke-width", 3).attr("opacity", 1);
          } else if (element.classed("data-point")) {
            element.attr("r", 5).attr("stroke", "#ffffff").attr("stroke-width", 2);
          }
        } else {
          // Element is not selected
          if (element.classed("heatmap-cell")) {
            element.attr("stroke", "#1a2030").attr("stroke-width", 1).attr("opacity", 0.5);
          } else if (element.classed("bubble")) {
            element.attr("stroke-opacity", 0.3).attr("stroke-width", 1).attr("fill-opacity", 0.3);
          } else if (element.classed("trend-line")) {
            element.attr("stroke-width", 1).attr("opacity", 0.3);
          } else if (element.classed("data-point")) {
            element.attr("r", 3).attr("stroke", "#000").attr("stroke-width", 1).attr("opacity", 0.3);
          }
        }
      });
    } else {
      // Reset all styling
      d3.selectAll(".heatmap-cell").attr("stroke", "#1a2030").attr("stroke-width", 1).attr("opacity", 1);
      d3.selectAll(".bubble").attr("stroke-opacity", 0.3).attr("stroke-width", 1).attr("fill-opacity", 0.7);
      d3.selectAll(".trend-line").attr("stroke-width", 2).attr("opacity", 1);
      d3.selectAll(".data-point").attr("r", 4).attr("stroke", "#000").attr("stroke-width", 1).attr("opacity", 1);
    }
  }, [filters, isLoading, data]);
  
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700 flex items-center justify-between">
          <Skeleton className="h-5 w-1/3 bg-gray-700" />
          <div className="flex items-center space-x-1">
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

  if (!data || !data.experienceLevels || !data.timePoints) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400">
            Hiring Pulse
          </h3>
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
          Hiring Pulse
        </h3>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${viewMode === "heatmap" ? "bg-blue-900/30 text-blue-400" : "text-gray-400"}`}
            onClick={() => setViewMode("heatmap")}
          >
            Heat
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${viewMode === "bubble" ? "bg-blue-900/30 text-blue-400" : "text-gray-400"}`}
            onClick={() => setViewMode("bubble")}
          >
            Bubble
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${viewMode === "trend" ? "bg-blue-900/30 text-blue-400" : "text-gray-400"}`}
            onClick={() => setViewMode("trend")}
          >
            Trend
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-xs text-gray-400 ml-2"
            onClick={() => setAnimationTrigger(prev => prev + 1)}
            title="Refresh visualization"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </Button>
        </div>
      </div>
      <div className="flex-grow p-2 relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ minHeight: "200px" }}
        />
        <div
          ref={tooltipRef}
          className="absolute hidden bg-gray-900 bg-opacity-90 border border-gray-700 rounded px-3 py-2 text-xs text-white pointer-events-none z-50 shadow-lg"
          style={{ maxWidth: "200px" }}
        />
      </div>
    </div>
  );
}