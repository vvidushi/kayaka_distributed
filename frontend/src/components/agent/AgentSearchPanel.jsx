import { useState } from 'react';
import { FaSearch, FaArrowLeft, FaCalendar, FaPlane, FaBed, FaCar, FaUser, FaClock } from 'react-icons/fa';

/**
 * Agent Search Panel - Allows user to review and modify search parameters
 */
const AgentSearchPanel = ({ 
  flow, 
  initialParams = {}, 
  onSearch, 
  onParamsChange,
  onBack 
}) => {
  const [params, setParams] = useState(initialParams);

  const handleChange = (field, value) => {
    const updated = { ...params, [field]: value };
    setParams(updated);
    if (onParamsChange) {
      onParamsChange(updated);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(params);
  };

  const isValid = () => {
    if (flow === 'flights') {
      return params.from && params.to && params.departDate;
    } else if (flow === 'hotels') {
      return params.city && params.checkIn && params.checkOut;
    } else if (flow === 'cars') {
      return params.location && params.pickUp && params.dropOff;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              {flow === 'flights' && <><FaPlane /> Review Flight Search</>}
              {flow === 'hotels' && <><FaBed /> Review Hotel Search</>}
              {flow === 'cars' && <><FaCar /> Review Car Search</>}
            </h2>
            <p className="text-sm text-base-content/70">
              Verify your details below and click search
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {flow === 'flights' && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">From</span>
                  </label>
                  <div className="relative">
                    <FaPlane className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="text"
                      value={params.from || ''}
                      onChange={(e) => handleChange('from', e.target.value)}
                      placeholder="Origin city or airport"
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">To</span>
                  </label>
                  <div className="relative">
                    <FaPlane className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="text"
                      value={params.to || ''}
                      onChange={(e) => handleChange('to', e.target.value)}
                      placeholder="Destination city or airport"
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Departure Date</span>
                  </label>
                  <div className="relative">
                    <FaCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="date"
                      value={params.departDate || ''}
                      onChange={(e) => handleChange('departDate', e.target.value)}
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Return Date (Optional)</span>
                  </label>
                  <div className="relative">
                    <FaCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="date"
                      value={params.returnDate || ''}
                      onChange={(e) => handleChange('returnDate', e.target.value)}
                      className="input input-bordered w-full pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Passengers</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <select
                    value={params.passengers || 1}
                    onChange={(e) => handleChange('passengers', parseInt(e.target.value))}
                    className="select select-bordered w-full pl-10"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Passenger' : 'Passengers'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {flow === 'hotels' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Destination</span>
                </label>
                <div className="relative">
                  <FaBed className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <input
                    type="text"
                    value={params.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City or destination"
                    className="input input-bordered w-full pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Check-in</span>
                  </label>
                  <div className="relative">
                    <FaCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="date"
                      value={params.checkIn || ''}
                      onChange={(e) => handleChange('checkIn', e.target.value)}
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Check-out</span>
                  </label>
                  <div className="relative">
                    <FaCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="date"
                      value={params.checkOut || ''}
                      onChange={(e) => handleChange('checkOut', e.target.value)}
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Guests</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <select
                    value={params.guests || 1}
                    onChange={(e) => handleChange('guests', parseInt(e.target.value))}
                    className="select select-bordered w-full pl-10"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {flow === 'cars' && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Pick-up Location</span>
                </label>
                <div className="relative">
                  <FaCar className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <input
                    type="text"
                    value={params.location || ''}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="City or airport"
                    className="input input-bordered w-full pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Pick-up Date</span>
                  </label>
                  <div className="relative">
                    <FaCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="date"
                      value={params.pickUp || ''}
                      onChange={(e) => handleChange('pickUp', e.target.value)}
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Pick-up Time</span>
                  </label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="time"
                      value={params.pickUpTime || '12:00'}
                      onChange={(e) => handleChange('pickUpTime', e.target.value)}
                      className="input input-bordered w-full pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Drop-off Date</span>
                  </label>
                  <div className="relative">
                    <FaCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="date"
                      value={params.dropOff || ''}
                      onChange={(e) => handleChange('dropOff', e.target.value)}
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Drop-off Time</span>
                  </label>
                  <div className="relative">
                    <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                    <input
                      type="time"
                      value={params.dropOffTime || '12:00'}
                      onChange={(e) => handleChange('dropOffTime', e.target.value)}
                      className="input input-bordered w-full pl-10"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="btn btn-ghost flex-1"
            >
              Back to Chat
            </button>
            <button
              type="submit"
              disabled={!isValid()}
              className="btn btn-primary flex-1 gap-2"
            >
              <FaSearch />
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentSearchPanel;
