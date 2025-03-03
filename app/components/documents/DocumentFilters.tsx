import { ChangeEvent } from 'react';

interface FilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

interface DocumentFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export function DocumentFilters({ filters, onFilterChange, onReset }: DocumentFiltersProps) {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h2>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="space-y-1">
          <label 
            htmlFor="search" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Search
          </label>
          <input
            type="text"
            id="search"
            name="search"
            value={filters.search}
            onChange={handleInputChange}
            placeholder="Search documents..."
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 
                     shadow-sm focus:border-blue-500 focus:ring-blue-500 
                     dark:bg-gray-700 dark:text-white sm:text-sm"
          />
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label 
            htmlFor="dateFrom" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Date From
          </label>
          <input
            type="date"
            id="dateFrom"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 
                     shadow-sm focus:border-blue-500 focus:ring-blue-500 
                     dark:bg-gray-700 dark:text-white sm:text-sm"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label 
            htmlFor="dateTo" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Date To
          </label>
          <input
            type="date"
            id="dateTo"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 
                     shadow-sm focus:border-blue-500 focus:ring-blue-500 
                     dark:bg-gray-700 dark:text-white sm:text-sm"
          />
        </div>

        {/* Status Select */}
        <div className="space-y-1">
          <label 
            htmlFor="status" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            value={filters.status}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 
                     shadow-sm focus:border-blue-500 focus:ring-blue-500 
                     dark:bg-gray-700 dark:text-white sm:text-sm"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
} 