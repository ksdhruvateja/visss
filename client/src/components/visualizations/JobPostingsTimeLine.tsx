import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { TimeLineData } from "@/types";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useFilterContext } from "@/contexts/FilterContext";

interface JobPostingsTimeLineProps {
  data: TimeLineData | undefined;
  isLoading: boolean;
}

export default function JobPostingsTimeLine({
  data,
  isLoading,
}: JobPostingsTimeLineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const brushRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [timeInterval, setTimeInterval] = useState<
    "Monthly" | "Weekly" | "Quarterly"
  >("Monthly");
  const [visibleExperienceLevels, setVisibleExperienceLevels] = useState<
    string[]
  >([]);
  const [brushExtent, setBrushExtent] = useState<[Date, Date] | null>(null);
  const [redrawTrigger, setRedrawTrigger] = useState(0);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const { filters, setFilters, activeItem, setActiveItem } = useFilterContext();

  // Set visible experience levels when data changes
  useEffect(() => {
    if (
      !isLoading &&
      data &&
      data.experienceLevels &&
      data.experienceLevels.length > 0
    ) {
      setVisibleExperienceLevels(data.experienceLevels);
    }
  }, [data, isLoading]);
  


  // Create a custom effect to ensure data points are interactive when zoomed in
  useEffect(() => {
    if (!brushExtent || !svgRef.current || isLoading || !data) return;

    // Add specific interactivity to data points after zoom
    const svg = d3.select(svgRef.current);
    const dataPoints = svg.selectAll(".data-point");

    // Make sure the points respond properly to clicks
    dataPoints.each(function () {
      const point = d3.select(this);
      const level = point.attr("data-level");

      // Update point appearance based on filter state
      if (filters.experienceLevels.includes(level)) {
        point
          .classed("selected", true)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      } else {
        point
          .classed("selected", false)
          .attr("stroke", "#2d3748")
          .attr("stroke-width", 1.5);
      }
    });
  }, [brushExtent, filters, isLoading, data]);

  // Effect for aggregating data by the selected time interval
  const getAggregatedData = () => {
    if (!data || !data.timePoints || !data.experienceLevels) return null;

    // Parse dates
    const timePoints = data.timePoints.map((date) => date);
    let aggregatedData: Record<string, Record<string, number>> = {};

    // Aggregate data based on selected time interval
    if (timeInterval === "Weekly") {
      // Weekly aggregation - group into weeks
      aggregatedData = {};
      data.experienceLevels.forEach((expLevel) => {
        aggregatedData[expLevel] = {};

        // Group timepoints into weeks
        let weekGroups: Record<string, { sum: number; count: number }> = {};

        data.timePoints.forEach((date) => {
          const weekOfYear = getWeekOfYear(date);
          if (!weekGroups[weekOfYear]) {
            weekGroups[weekOfYear] = { sum: 0, count: 0 };
          }

          weekGroups[weekOfYear].sum += data.data[expLevel][date] || 0;
          weekGroups[weekOfYear].count += 1;
        });

        // Calculate averages and format without "Week" prefix
        Object.entries(weekGroups).forEach(([week, stats]) => {
          // Get date of the first day of the week
          const weekDate = getDateOfWeek(parseInt(week));
          aggregatedData[expLevel][`${format(weekDate, "MMM dd")}`] =
            Math.round(stats.sum / stats.count);
        });
      });

      // Create new time points for weeks
      const newTimePoints = Object.keys(
        Object.values(aggregatedData)[0] || {},
      ).sort();

      return {
        timePoints: newTimePoints,
        experienceLevels: data.experienceLevels,
        data: aggregatedData,
      };
    } else if (timeInterval === "Quarterly") {
      // Quarterly aggregation
      aggregatedData = {};
      data.experienceLevels.forEach((expLevel) => {
        aggregatedData[expLevel] = {};

        // Group timepoints into quarters
        let quarterGroups: Record<string, { sum: number; count: number }> = {};

        data.timePoints.forEach((date) => {
          const quarter = getQuarter(date);
          if (!quarterGroups[quarter]) {
            quarterGroups[quarter] = { sum: 0, count: 0 };
          }

          quarterGroups[quarter].sum += data.data[expLevel][date] || 0;
          quarterGroups[quarter].count += 1;
        });

        // Calculate averages
        Object.entries(quarterGroups).forEach(([quarter, stats]) => {
          aggregatedData[expLevel][quarter] = Math.round(
            stats.sum / stats.count,
          );
        });
      });

      // Create new time points for quarters
      const newTimePoints = Object.keys(
        Object.values(aggregatedData)[0] || {},
      ).sort();

      return {
        timePoints: newTimePoints,
        experienceLevels: data.experienceLevels,
        data: aggregatedData,
      };
    } else {
      // Monthly (default) - use the original data
      return {
        timePoints,
        experienceLevels: data.experienceLevels,
        data: data.data,
      };
    }
  };

  // Helper function to get week of year from date string
  const getWeekOfYear = (dateStr: string) => {
    const date = parseISO(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
    );
    return Math.ceil((days + startOfYear.getDay() + 1) / 7).toString();
  };

  // Helper function to get the date of a specific week number
  const getDateOfWeek = (weekNum: number) => {
    // Create a date object for January 1st of the current year
    const year = new Date().getFullYear();
    const januaryFirst = new Date(year, 0, 1);

    // Calculate days to add to get to the first day of the requested week
    // Week 1 starts on the first day of the year
    const daysToAdd = (weekNum - 1) * 7;

    // Create date for the first day of the requested week
    const result = new Date(januaryFirst);
    result.setDate(januaryFirst.getDate() + daysToAdd);

    return result;
  };

  // Helper function to get quarter from date string
  const getQuarter = (dateStr: string) => {
    const date = parseISO(dateStr);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${date.getFullYear()}`;
  };

  const aggregatedData = getAggregatedData();

  useEffect(() => {
    if (isLoading || !aggregatedData) return;

    // Clear any existing visualization
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set up dimensions and margins
    const margin = { top: 30, right: 120, bottom: 70, left: 60 };
    const width = svgRef.current!.clientWidth - margin.left - margin.right;
    const height =
      svgRef.current!.clientHeight - margin.top - margin.bottom - 50; // Extra space for brush

    // Create the SVG container
    const g = svg
      .append("g")
      .attr("class", "chart-group")
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

    // Apply brush extent if set
    if (brushExtent) {
      x.domain(brushExtent);
    }

    // Find the maximum count for Y scale
    let maxCount = 0;
    aggregatedData.experienceLevels.forEach((level) => {
      aggregatedData.timePoints.forEach((time) => {
        const count = aggregatedData.data[level][time] || 0;
        maxCount = Math.max(maxCount, count);
      });
    });

    // Create Y scale
    const y = d3
      .scaleLinear()
      .domain([0, maxCount * 1.1])
      .range([height, 0]);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) => format(d as Date, "MMM yyyy")),
      )
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .style("fill", "#e2e8f0"); // Light color for better visibility

    // Style the axis lines
    g.selectAll(".domain, .tick line").style("stroke", "#4b5563");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#e2e8f0"); // Light color for better visibility

    // Add title
    g.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text("Job Postings Over Time by Experience Level");

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current);

    // Experience level colors with futuristic palette
    const levelColors: Record<string, string> = {
      "Entry-level": "#3B82F6",
      "Mid-level": "#06B6D4",
      "Senior-level": "#10B981",
      Executive: "#8B5CF6",
      Internship: "#F97316",
    };

    // Draw lines for each experience level
    aggregatedData.experienceLevels.forEach((level) => {
      if (!visibleExperienceLevels.includes(level)) return;

      // Create the data points for this line
      const lineData = aggregatedData.timePoints.map((time) => ({
        time,
        count: aggregatedData.data[level][time] || 0,
        level, // Store the level with each data point
      }));

      // Create a custom line generator for this specific level
      const linePath = d3
        .line<{ time: string; count: number; level: string }>()
        .x((d) => x(parseDate(d.time)))
        .y((d) => y(d.count))
        .curve(d3.curveMonotoneX);

      // Draw the line with enhanced interactivity
      const isLevelSelected = filters.experienceLevels.includes(level);
      const isAnyFilterActive = filters.experienceLevels.length > 0;

      // Calculate proper class based on selection state
      let lineClass = "timeline-line";
      if (isLevelSelected) {
        lineClass += " selected";
      } else if (isAnyFilterActive) {
        lineClass += " faded";
      }

      g.append("path")
        .datum(lineData)
        .attr("class", lineClass)
        .attr("fill", "none")
        .attr(
          "stroke",
          levelColors[level] ||
            d3.schemeCategory10[
              aggregatedData.experienceLevels.indexOf(level) % 10
            ],
        )
        .attr("stroke-width", isLevelSelected ? 4 : 2.5)
        .attr("data-level", level) // Add data attribute for filtering
        .style(
          "filter",
          isLevelSelected
            ? "drop-shadow(0px 0px 8px rgba(255,255,255,0.7))"
            : "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))",
        )
        .style("cursor", "pointer")
        .attr("d", linePath)
        .on("mouseover", function (event) {
          // Highlight the line
          d3.select(this)
            .attr("stroke-width", 4)
            .style("filter", "drop-shadow(0px 0px 8px rgba(255,255,255,0.5))");

          // Set active item in filter context
          setActiveItem({ type: "experienceLevel", value: level });

          // Show tooltip with experience level info
          const avgJobCount =
            lineData.reduce((sum, d) => sum + d.count, 0) / lineData.length;
          const maxJobCount = Math.max(...lineData.map((d) => d.count));
          const minJobCount = Math.min(...lineData.map((d) => d.count));
          const totalJobs = lineData.reduce((sum, d) => sum + d.count, 0);

          // Get growth trend
          const firstValue = lineData[0].count;
          const lastValue = lineData[lineData.length - 1].count;
          const growth =
            lastValue > firstValue
              ? `+${Math.round(((lastValue - firstValue) / firstValue) * 100)}%`
              : `${Math.round(((lastValue - firstValue) / firstValue) * 100)}%`;

          tooltip
            .style("opacity", 1)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`).html(`
              <div class="text-sm font-medium mb-1">${level}</div>
              <div class="grid grid-cols-2 gap-x-2 text-xs">
                <div>Total Jobs:</div>
                <div class="text-right font-medium">${totalJobs.toLocaleString()}</div>
                <div>Average:</div>
                <div class="text-right font-medium">${Math.round(avgJobCount).toLocaleString()}</div>
                <div>Peak Count:</div>
                <div class="text-right font-medium">${maxJobCount.toLocaleString()}</div>
                <div>Growth:</div>
                <div class="text-right font-medium ${lastValue > firstValue ? "text-green-400" : "text-red-400"}">${growth}</div>
              </div>
              <div class="text-xs italic mt-1">Click to filter</div>
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", function () {
          // Reset line style if not selected
          const isLevelSelected = filters.experienceLevels.includes(level);
          if (!isLevelSelected) {
            d3.select(this)
              .attr("stroke-width", 2.5)
              .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))");
          }

          // Reset active item
          setActiveItem({ type: null, value: null });

          // Hide tooltip
          tooltip.style("opacity", 0);
        })
        .on("click", function () {
          // Toggle this experience level in filters
          const newFilters = { ...filters };
          const isLevelSelected = newFilters.experienceLevels.includes(level);

          if (isLevelSelected) {
            // Remove this level from filters
            newFilters.experienceLevels = newFilters.experienceLevels.filter(
              (l) => l !== level,
            );
          } else {
            // Add this level to filters
            newFilters.experienceLevels = [
              ...newFilters.experienceLevels,
              level,
            ];
          }

          // Update filters
          setFilters(newFilters);

          // Update visible levels for the chart
          const isCurrentlyVisible = visibleExperienceLevels.includes(level);
          if (isCurrentlyVisible && visibleExperienceLevels.length > 1) {
            setVisibleExperienceLevels(
              visibleExperienceLevels.filter((l) => l !== level),
            );
          } else if (!isCurrentlyVisible) {
            setVisibleExperienceLevels([...visibleExperienceLevels, level]);
          }
        });

      // Add dots for each data point
      g.selectAll(`dot-${level.replace(/\s+/g, "-")}`)
        .data(lineData)
        .enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("cx", (d) => x(parseDate(d.time)))
        .attr("cy", (d) => y(d.count))
        .attr("r", 4)
        .attr(
          "fill",
          levelColors[level] ||
            d3.schemeCategory10[
              aggregatedData.experienceLevels.indexOf(level) % 10
            ],
        )
        .attr("stroke", "#2d3748")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .attr("data-level", (d) => d.level) // Add data attribute for easier selection
        .attr("data-time", (d) => d.time) // Add data attribute for filtering
        .on("mouseover", function (event, d) {
          // Set active item in filter context
          setActiveItem({ type: "experienceLevel", value: d.level });

          d3.select(this)
            .attr("r", 6)
            .attr("stroke", "#fff")
            .style("filter", "drop-shadow(0px 0px 6px rgba(255,255,255,0.5))");

          tooltip.style("opacity", 1).html(`
              <div class="font-medium">${d.level}</div>
              <div>${format(parseDate(d.time), "MMMM yyyy")}</div>
              <div>Job Count: ${d.count}</div>
              <div class="text-xs italic">Click to filter by experience level</div>
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", function () {
          // Only reset active item if we're not being clicked
          if (!d3.select(this).classed("selected")) {
            setActiveItem({ type: null, value: null });
          }

          d3.select(this)
            .attr("r", 4)
            .attr("stroke", "#2d3748")
            .style("filter", "none");

          tooltip.style("opacity", 0);
        })
        .on("click", function (event, d) {
          event.preventDefault();
          event.stopPropagation();
          
          // Get the experience level for this point
          const experienceLevel = d.level;
          
          // Check if this level is already in our selected levels
          const isAlreadySelected = selectedLevels.includes(experienceLevel);
          
          // Toggle selection state for this level
          if (isAlreadySelected) {
            // If it's the only selected level, clear selection
            if (selectedLevels.length === 1) {
              setSelectedLevels([]);
            } else {
              // Otherwise remove this level from selection
              setSelectedLevels(selectedLevels.filter(level => level !== experienceLevel));
            }
          } else {
            // Add this level to our selections
            setSelectedLevels([...selectedLevels, experienceLevel]);
          }
          
          // Update the active item to highlight in filter context
          setActiveItem({ type: "experienceLevel", value: experienceLevel });
          
          // Update visual indication of selection
          const newSelected = !isAlreadySelected;
          d3.select(this)
            .classed("selected", newSelected)
            .attr("stroke", newSelected ? "#fff" : "#2d3748")
            .attr("stroke-width", newSelected ? 2 : 1.5);

          // Show updated tooltip with selection state
          tooltip.style("opacity", 1).html(`
              <div class="font-medium">${d.level}</div>
              <div>${format(parseDate(d.time), "MMMM yyyy")}</div>
              <div>Job Count: ${d.count}</div>
              <div class="text-xs italic text-${newSelected ? "green" : "red"}-400">
                ${newSelected ? "✓ Added to filters" : "✕ Removed from filters"}
              </div>
            `);

          // Position the tooltip near the data point
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`);

          // Keep tooltip visible for a longer moment
          setTimeout(() => {
            tooltip.style("opacity", 0);
          }, 2000);
        });
    });

    // Add legend
    const legend = g
      .append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data(aggregatedData.experienceLevels)
      .enter()
      .append("g")
      .attr("transform", (d, i) => `translate(${width + 10},${i * 20})`)
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        event.preventDefault();
        event.stopPropagation();
        
        // Get the experience level for this legend item
        const experienceLevel = d;
        
        // Check if this level is already selected in the filters
        const isInFilters = filters.experienceLevels.includes(experienceLevel);
        
        // Toggle selection state
        const newFilters = { ...filters };
        
        if (isInFilters) {
          // If already selected, remove from filters
          newFilters.experienceLevels = newFilters.experienceLevels.filter(
            (e) => e !== experienceLevel
          );
        } else {
          // If not selected, add to filters
          newFilters.experienceLevels = [
            ...newFilters.experienceLevels,
            experienceLevel
          ];
        }
        
        // Update the filters
        setFilters(newFilters);
        
        // Update the active item to highlight in filter context
        setActiveItem({ type: "experienceLevel", value: experienceLevel });
        
        // Also update visibility in the chart itself
        const isCurrentlyVisible = visibleExperienceLevels.includes(experienceLevel);
        if (isCurrentlyVisible && visibleExperienceLevels.length > 1) {
          setVisibleExperienceLevels(
            visibleExperienceLevels.filter((l) => l !== experienceLevel)
          );
        } else if (!isCurrentlyVisible) {
          setVisibleExperienceLevels([...visibleExperienceLevels, experienceLevel]);
        }
      });

    legend
      .append("rect")
      .attr("x", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr(
        "fill",
        (d) =>
          levelColors[d] ||
          d3.schemeCategory10[aggregatedData.experienceLevels.indexOf(d) % 10],
      )
      .attr("opacity", (d) => (visibleExperienceLevels.includes(d) ? 1 : 0.3));

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 7.5)
      .attr("dy", "0.32em")
      .style("fill", "#e2e8f0")
      .text((d) => d);

    // Add brush component for zooming
    const brushHeight = 40;
    const brushArea = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left},${margin.top + height + 30})`,
      );

    // Create a copy of the X scale for the brush
    const xBrush = d3
      .scaleTime()
      .domain(d3.extent(timePoints) as [Date, Date])
      .range([0, width]);

    // Create an area generator for the brush background
    const brushAreaGenerator = d3
      .area<string>()
      .x((d) => xBrush(parseDate(d)))
      .y0(brushHeight)
      .y1((d) => {
        // Sum counts across all experience levels for this time point
        let total = 0;
        aggregatedData.experienceLevels.forEach((lvl) => {
          total += aggregatedData.data[lvl][d] || 0;
        });
        return brushHeight - (total / maxCount) * brushHeight;
      })
      .curve(d3.curveMonotoneX);

    // Add the area
    brushArea
      .append("path")
      .datum(aggregatedData.timePoints)
      .attr("fill", "rgba(56, 189, 248, 0.3)")
      .attr("stroke", "rgba(56, 189, 248, 0.6)")
      .attr("stroke-width", 1)
      .attr("d", brushAreaGenerator);

    // Add X axis for brush
    brushArea
      .append("g")
      .attr("transform", `translate(0,${brushHeight})`)
      .call(
        d3
          .axisBottom(xBrush)
          .tickSize(0)
          .tickFormat(() => ""),
      );

    // Create the brush
    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [width, brushHeight],
      ])
      .on("end", (event) => {
        if (!event.selection) {
          // If the brush is cleared, reset to the full domain
          setBrushExtent(null);
          return;
        }

        // Convert brush selection from pixels to dates
        const [x0, x1] = event.selection as [number, number];
        const newDomain = [xBrush.invert(x0), xBrush.invert(x1)] as [
          Date,
          Date,
        ];

        // Update the brush extent
        setBrushExtent(newDomain);

        // Store the currently active experience level to restore it after redraw
        const activeExp =
          activeItem.type === "experienceLevel" ? activeItem.value : null;
        if (activeExp) {
          // We'll restore this after the chart is redrawn
          setTimeout(() => {
            setActiveItem({ type: "experienceLevel", value: activeExp });
          }, 100);
        }
      });

    // Add the brush to the SVG
    const brushG = brushArea.append("g").attr("class", "brush").call(brush);

    // If there's an existing brush extent, set the brush to that position
    if (brushExtent) {
      brushG.call(brush.move, [xBrush(brushExtent[0]), xBrush(brushExtent[1])]);
    }

    // Add responsive resize handler
    const handleResize = () => {
      // This would normally redraw the chart on resize
      // For simplicity, we'll just reload the component
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    data,
    isLoading,
    visibleExperienceLevels,
    timeInterval,
    brushExtent,
    aggregatedData,
    redrawTrigger,
  ]);

  // Initialize selected levels
  useEffect(() => {
    if (data && data.experienceLevels && data.experienceLevels.length > 0) {
      // Start with all levels selected
      setSelectedLevels(data.experienceLevels);
    }
  }, [data]);

  // Effect to update line styling based on selected levels
  useEffect(() => {
    if (!svgRef.current || isLoading || !data) return;

    // Get all timeline lines
    const lines = d3.select(svgRef.current).selectAll(".timeline-line");

    // Update classes based on selected levels
    lines.each(function () {
      const line = d3.select(this);
      const level = line.attr("data-level");

      if (!level) return; // Skip if no level attribute

      // Check if this level is in the selected levels
      const isSelected = selectedLevels.includes(level);

      // Update class based on selection state
      if (selectedLevels.length === 0) {
        // No selection means show all lines normally
        line.classed("selected", false).classed("faded", false);
      } else if (isSelected) {
        // Show selected lines highlighted
        line.classed("selected", true).classed("faded", false);
      } else {
        // Fade out non-selected lines
        line.classed("selected", false).classed("faded", true);
      }
    });
  }, [selectedLevels, data, isLoading]);
  
  // Effect to sync selectedLevels with global filters
  // This is separated to avoid update loops
  useEffect(() => {
    // Skip if we're still loading
    if (isLoading) return;
    
    // Find if selected levels differ from experience filters
    const currentFilterLevels = filters.experienceLevels || [];
    
    // Only update if necessary to avoid infinite loops
    const needsUpdate = 
      (selectedLevels.length !== currentFilterLevels.length) || 
      selectedLevels.some(level => !currentFilterLevels.includes(level));
      
    if (needsUpdate) {
      const newFilters = { ...filters };
      
      if (selectedLevels.length > 0) {
        newFilters.experienceLevels = [...selectedLevels];
      } else {
        newFilters.experienceLevels = [];
      }
      
      setFilters(newFilters);
    }
  }, [selectedLevels, isLoading]);

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

  // Handle the case when data is undefined
  if (!data || !data.experienceLevels || !data.timePoints) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 h-full flex flex-col">
        <div className="p-2 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400">
            Job Posting Trends
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
        <div className="flex items-center">
          <h3 className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
            Job Posting Trends
          </h3>
          <span className="ml-2 text-xs text-gray-400">Click on lines or legend to filter</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${timeInterval === "Weekly" ? "bg-blue-900/30 text-blue-400" : "text-gray-400"}`}
            onClick={() => {
              setTimeInterval("Weekly");
              setBrushExtent(null);
              setRedrawTrigger((prev) => prev + 1);
            }}
          >
            W
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${timeInterval === "Monthly" ? "bg-blue-900/30 text-blue-400" : "text-gray-400"}`}
            onClick={() => {
              setTimeInterval("Monthly");
              setBrushExtent(null);
              setRedrawTrigger((prev) => prev + 1);
            }}
          >
            M
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 px-2 py-0 text-xs ${timeInterval === "Quarterly" ? "bg-blue-900/30 text-blue-400" : "text-gray-400"}`}
            onClick={() => {
              setTimeInterval("Quarterly");
              setBrushExtent(null);
              setRedrawTrigger((prev) => prev + 1);
            }}
          >
            Q
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
