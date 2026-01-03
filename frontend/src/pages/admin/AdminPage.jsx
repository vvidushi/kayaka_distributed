import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api/admin';
import { useToast } from '../../hooks/useToast';

const AdminPage = () => {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState({
    revenue: null,
    topProviders: null,
    topProperties: null,
    cityRevenue: null,
    lastMonthProviders: null,
    bills: null,
  });
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    limit: 10,
    month: '',
    billStatus: '',
  });

  const loadReports = async () => {
    try {
      setLoading(true);
      const [revenue, topProviders, topProperties, cityRevenue, lastMonthProviders] =
        await Promise.all([
          adminApi.getRevenueReport({ groupBy: 'month' }),
          adminApi.getTopProviders({ limit: filters.limit }),
          adminApi.getTopProperties({ year: filters.year, limit: filters.limit }),
          adminApi.getCityRevenue({ year: filters.year }),
          adminApi.getProvidersLastMonth({ limit: filters.limit }),
        ]);
      setReports((prev) => ({
        ...prev,
        revenue,
        topProviders,
        topProperties,
        cityRevenue,
        lastMonthProviders,
      }));
    } catch (error) {
      console.error('Error loading reports', error);
      toast.showError('Failed to load admin reports');
    } finally {
      setLoading(false);
    }
  };

  const searchBills = async () => {
    try {
      setLoading(true);
      const bills = await adminApi.searchBills({
        status: filters.billStatus || undefined,
        month: filters.month || undefined,
        limit: 20,
        offset: 0,
      });
      setReports((prev) => ({ ...prev, bills }));
    } catch (error) {
      console.error('Error searching bills', error);
      toast.showError('Failed to search bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    searchBills();
  }, []);

  const renderList = (title, items, renderItem) => (
    <div className="card bg-base-100 shadow-md border border-base-300">
      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        {(!items || items.length === 0) && <p className="text-sm text-base-content/70">No data</p>}
        <div className="space-y-2">
          {items && items.map(renderItem)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base-100">
      <div className="bg-base-100/90 backdrop-blur-sm border-b border-base-300">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-base-content/70">Insights and billing search</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body grid md:grid-cols-4 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Year</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Limit</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bills Month (YYYY-MM)</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                placeholder="2025-11"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bill Status</span>
              </label>
              <select
                className="select select-bordered"
                value={filters.billStatus}
                onChange={(e) => setFilters({ ...filters, billStatus: e.target.value })}
              >
                <option value="">Any</option>
                <option value="PENDING">Pending</option>
                <option value="AUTHORIZED">Authorized</option>
                <option value="SUCCEEDED">Succeeded</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
            <div className="md:col-span-4 flex gap-3">
              <button className="btn btn-primary" onClick={loadReports} disabled={loading}>
                Refresh Reports
              </button>
              <button className="btn btn-outline" onClick={searchBills} disabled={loading}>
                Search Bills
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {renderList(
            'Top Properties (by revenue)',
            reports.topProperties?.items,
            (item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span className="font-semibold">${item.revenue?.toFixed(2) || 0}</span>
              </div>
            )
          )}

          {renderList(
            'City-wise Revenue',
            reports.cityRevenue?.items,
            (item) => (
              <div key={item.city} className="flex justify-between text-sm">
                <span>{item.city}</span>
                <span className="font-semibold">${item.revenue?.toFixed(2) || 0}</span>
              </div>
            )
          )}

          {renderList(
            'Top Providers (all time)',
            reports.topProviders?.providers,
            (item) => (
              <div key={item.provider} className="flex justify-between text-sm">
                <span>{item.provider}</span>
                <span className="font-semibold">${item.totalRevenue?.toFixed(2) || 0}</span>
              </div>
            )
          )}

          {renderList(
            'Top Providers (last month)',
            reports.lastMonthProviders?.providers,
            (item) => (
              <div key={item.provider} className="flex justify-between text-sm">
                <span>{item.provider}</span>
                <span className="font-semibold">${item.totalRevenue?.toFixed(2) || 0}</span>
              </div>
            )
          )}
        </div>

        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <h3 className="card-title mb-2">Billing Search</h3>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Booking</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.bills?.items?.length ? (
                    reports.bills.items.map((bill) => (
                      <tr key={bill.id}>
                        <td className="font-mono text-xs">{bill.id}</td>
                        <td className="text-xs">{bill.bookingId}</td>
                        <td><span className="badge badge-sm">{bill.status}</span></td>
                        <td>{bill.currency} {bill.amount?.toFixed(2)}</td>
                        <td className="text-xs">{new Date(bill.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-base-content/70">No bills found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
