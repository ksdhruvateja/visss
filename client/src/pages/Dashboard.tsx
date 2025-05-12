import Header from "@/components/layout/Header";
import FilterControls from "@/components/dashboard/FilterControls";
import SalaryExperienceBoxPlot from "@/components/visualizations/SalaryExperienceBoxPlot";
import SalaryLocationIndustryBarChart from "@/components/visualizations/SalaryLocationIndustryBarChart";
import SalaryJobTitleRidgeline from "@/components/visualizations/SalaryJobTitleRidgeline";
import SalaryPostingDateScatter from "@/components/visualizations/SalaryPostingDateScatter";
import JobCountStackedBar from "@/components/visualizations/JobCountStackedBar";
import JobPostingsTimeLine from "@/components/visualizations/JobPostingsTimeLine";
import GeographicMapChart from "@/components/visualizations/GeographicMapChart";
import { FilterOptions } from "@/types";
import useEmploymentData from "@/hooks/useEmploymentData";
import { useFilterContext } from "@/contexts/FilterContext";

export default function Dashboard() {
  const { filters, setFilters } = useFilterContext();

  const {
    visualizationData,
    isLoading,
    error,
    locations,
  } = useEmploymentData(filters);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-950 to-gray-900 text-white overflow-hidden">
      <Header />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Visualization Controls - minimized */}
        <div className="z-10 px-1">
          <FilterControls
            onFilterChange={handleFilterChange}
            locations={locations || []}
            isLoading={isLoading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/60 border border-red-700 text-red-200 px-2 py-1 mx-1 rounded-md text-xs">
            <strong className="font-medium">Error:</strong>
            <span className="ml-1">{error}</span>
          </div>
        )}

        {/* Grid layout with optimized visualization sizing and spacing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 flex-1 p-1 overflow-hidden">
          {/* Row 1: Left side charts */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-1 h-full">
            <div className="w-full h-full">
              <SalaryLocationIndustryBarChart
                data={visualizationData?.groupedBar}
                isLoading={isLoading}
              />
            </div>

            <div className="w-full h-full">
              <SalaryJobTitleRidgeline
                data={visualizationData?.ridgeline}
                isLoading={isLoading}
              />
            </div>
            
            <div className="w-full h-full">
              <SalaryPostingDateScatter
                data={visualizationData?.scatterPlot}
                isLoading={isLoading}
              />
            </div>
            
            <div className="w-full h-full">
              <JobCountStackedBar
                data={visualizationData?.stackedBar}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Row 1: Right side - Map and Timeline stacked */}
          <div className="flex flex-col gap-1 h-full">
            {/* Geographic map now takes less space */}
            <div className="w-full h-1/2">
              <GeographicMapChart 
                isLoading={isLoading}
              />
            </div>
            
            <div className="w-full h-1/2">
              <JobPostingsTimeLine
                data={visualizationData?.timeLine}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}