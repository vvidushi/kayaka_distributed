import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listingsApi } from '../../services/api/listings';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const HotelPriceCalendar = ({ selectedDate, onDateSelect, city, state, minDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : today;

  // Calculate date range for API call (current month + next month)
  const getDateRange = () => {
    const start = new Date(currentMonth);
    const end = new Date(currentMonth);
    end.setMonth(end.getMonth() + 2);
    end.setDate(0); // Last day of next month
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch prices for the date range
  const { data: priceData, isLoading } = useQuery({
    queryKey: ['hotel-prices', city, state, startDate, endDate],
    queryFn: async () => {
      if (!city) {
        return { prices: {} };
      }
      try {
        const data = await listingsApi.getHotelPricesByDate({
          city,
          state,
          startDate,
          endDate,
        });
        
        // Backend returns array format: [{date, price}, ...]
        // Convert to object format: {date: price, ...}
        if (Array.isArray(data)) {
          const pricesMap = {};
          data.forEach(item => {
            pricesMap[item.date] = Math.round(item.price);
          });
          return { prices: pricesMap };
        }
        
        return data || { prices: {} };
      } catch (error) {
        console.error('Failed to load hotel prices:', error);
        return { prices: {} };
      }
    },
    enabled: !!city,
  });

  const prices = priceData?.prices || {};

  // Calculate price range for color coding
  const getPriceColorClass = (price) => {
    if (!price || Object.keys(prices).length === 0) return '';
    
    const priceValues = Object.values(prices).filter(p => p !== undefined && p !== null);
    if (priceValues.length === 0) return '';
    
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return 'text-success'; // All same price
    
    const normalizedPrice = (price - minPrice) / priceRange;
    
    // Color scale: green (low) -> yellow (medium) -> red (high)
    if (normalizedPrice <= 0.33) return 'text-success'; // Low prices - green
    if (normalizedPrice <= 0.66) return 'text-warning'; // Medium prices - orange
    return 'text-error'; // High prices - red
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateDisabled = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date < minDateObj;
  };

  const isDateSelected = (dateStr) => {
    return dateStr === selectedDate;
  };

  const handleDateClick = (dateStr) => {
    if (!isDateDisabled(dateStr)) {
      onDateSelect(dateStr);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const date = new Date(dateStr + 'T00:00:00');
      const disabled = isDateDisabled(dateStr);
      const selected = isDateSelected(dateStr);
      const price = prices[dateStr];
      const isToday = dateStr === today.toISOString().split('T')[0];

      days.push(
        <div
          key={dateStr}
          className={`
            aspect-square flex flex-col items-center justify-center p-1 rounded-lg transition-all border-2
            ${disabled 
              ? 'opacity-30 cursor-not-allowed border-transparent' 
              : 'cursor-pointer hover:bg-base-200 border-transparent'
            }
            ${selected 
              ? 'bg-primary text-primary-content border-primary' 
              : ''
            }
            ${isToday && !selected 
              ? 'border-primary' 
              : ''
            }
          `}
          onClick={() => !disabled && handleDateClick(dateStr)}
        >
          <div className="text-sm font-medium">{day}</div>
          {price !== undefined && price !== null && (
            <div className={`text-xs mt-0.5 font-bold ${selected ? 'text-primary-content' : getPriceColorClass(price)}`}>
              ${price}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md min-w-[350px]">
      <div className="calendar-header flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="btn btn-ghost btn-sm"
          aria-label="Previous month"
        >
          <FaChevronLeft />
        </button>
        <h3 className="text-xl font-bold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={handleNextMonth}
          className="btn btn-ghost btn-sm"
          aria-label="Next month"
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="calendar-weekdays grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-base-content/70 py-2">
            {day}
          </div>
        ))}
      </div>

      {isLoading && city ? (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        <div className="calendar-days grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>
      )}

      {!city && (
        <div className="mt-4 text-sm text-base-content/70 text-center">
          Select a location to see prices
        </div>
      )}

      {/* Price color legend */}
      {city && Object.keys(prices).length > 0 && (
        <div className="mt-4 pt-4 border-t border-base-300">
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-base-content/70">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span className="text-base-content/70">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-error"></div>
              <span className="text-base-content/70">High</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelPriceCalendar;

