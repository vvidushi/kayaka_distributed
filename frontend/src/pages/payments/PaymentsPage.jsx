import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../../services/api/payments';
import { bookingsApi } from '../../services/api/bookings';
import { useToast } from '../../hooks/useToast';
import { FaCreditCard, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';

const PaymentsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    bookingId: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    bookingId: '',
    amount: '',
    currency: 'USD',
  });
  const [paymentMethod, setPaymentMethod] = useState({
    type: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });
  const [paymentErrors, setPaymentErrors] = useState({});
  const toast = useToast();

  const bookingFromState = location.state;

  useEffect(() => {
    if (bookingFromState?.bookingId) {
      setNewPayment({
        bookingId: bookingFromState.bookingId,
        amount: bookingFromState.amount || '',
        currency: bookingFromState.currency || 'USD',
      });
      setShowCreateModal(true);
    }
    loadPayments();
    loadBookings();
  }, [filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.bookingId) params.bookingId = filters.bookingId;

      const response = await paymentsApi.listPayments(params);
      setPayments(response.items || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.showError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await bookingsApi.searchBookings({ status: 'PENDING' });
      setBookings(response.items || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const resetPaymentForm = () => {
    setShowCreateModal(false);
    setNewPayment({ bookingId: '', amount: '', currency: 'USD' });
    setPaymentMethod({ type: 'card', cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
    setPaymentErrors({});
  };

  const clearPaymentError = (field) => {
    setPaymentErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validatePaymentMethod = () => {
    if (!bookingFromState?.bookingId) {
      return true;
    }

    const errors = {};
    const digitsOnly = paymentMethod.cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digitsOnly)) {
      errors.cardNumber = 'Enter a valid card number (13-19 digits)';
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentMethod.expiryDate)) {
      errors.expiryDate = 'Use MM/YY format';
    }

    if (!/^\d{3,4}$/.test(paymentMethod.cvv)) {
      errors.cvv = 'Enter a 3 or 4 digit CVV';
    }

    if (!paymentMethod.cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required';
    }

    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (bookingFromState?.bookingId && !validatePaymentMethod()) {
      toast.showError('Please fix the highlighted payment details');
      return;
    }

    try {
      setProcessing({ create: true });
      const paymentData = {
        bookingId: newPayment.bookingId,
        amount: parseFloat(newPayment.amount),
        currency: newPayment.currency,
      };
      if (bookingFromState?.bookingId) {
        paymentData.paymentMethod = paymentMethod;
      }

      const payment = await paymentsApi.createPayment(paymentData);

      if (bookingFromState?.bookingId) {
        await handleProcessPaymentWithMethod(payment.id);
      } else {
        toast.showSuccess('Payment created successfully');
        resetPaymentForm();
        loadPayments();
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.showError(error.response?.data?.message || 'Failed to create payment');
    } finally {
      setProcessing({ create: false });
    }
  };

  const handleProcessPaymentWithMethod = async (paymentId) => {
    try {
      setProcessing({ [`process-${paymentId}`]: true });
      const paymentMethodData = {
        type: paymentMethod.type,
        cardNumber: paymentMethod.cardNumber.replace(/\s/g, ''),
        expiryDate: paymentMethod.expiryDate,
        cvv: paymentMethod.cvv,
        cardholderName: paymentMethod.cardholderName,
      };

      await paymentsApi.processPayment(paymentId, paymentMethodData);
      toast.showSuccess('Payment processed successfully!');
      resetPaymentForm();
      loadPayments();

      setTimeout(() => {
        navigate('/bookings');
      }, 1500);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.showError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessing({ [`process-${paymentId}`]: false });
    }
  };

  const handleProcessPayment = async (paymentId) => {
    try {
      setProcessing({ [paymentId]: true });
      await paymentsApi.processPayment(paymentId);
      toast.showSuccess('Payment processed successfully');
      loadPayments();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.showError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessing({ [paymentId]: false });
    }
  };

  const handleRefundPayment = async (paymentId, amount = null) => {
    if (!window.confirm('Are you sure you want to refund this payment? The associated booking will be cancelled.')) {
      return;
    }

    try {
      setProcessing({ [`refund-${paymentId}`]: true });
      await paymentsApi.refundPayment(paymentId, amount);
      toast.showSuccess('Payment refunded successfully. Booking has been cancelled.');
      loadPayments();
      loadBookings();
    } catch (error) {
      console.error('Error refunding payment:', error);
      toast.showError(error.response?.data?.message || 'Failed to refund payment');
    } finally {
      setProcessing({ [`refund-${paymentId}`]: false });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'badge-warning',
      AUTHORIZED: 'badge-info',
      SUCCEEDED: 'badge-success',
      FAILED: 'badge-error',
      REFUNDED: 'badge-neutral',
    };
    return badges[status] || 'badge-neutral';
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="bg-base-100/90 backdrop-blur-sm border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-base-content">Payments</h1>
              <p className="text-base-content/70">Manage your payment transactions</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Payment
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <div className="flex gap-4 flex-wrap">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="AUTHORIZED">Authorized</option>
                  <option value="SUCCEEDED">Succeeded</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Booking ID</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="Filter by booking ID"
                  value={filters.bookingId}
                  onChange={(e) => setFilters({ ...filters, bookingId: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : payments.length === 0 ? (
          <div className="card bg-base-100 shadow-md border border-base-300">
            <div className="card-body text-center py-12">
              <p className="text-base-content/70">No payments found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="card bg-base-100 shadow-md border border-base-300">
                <div className="card-body">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">
                          Payment {payment.id.substring(0, 8)}...
                        </h3>
                        <span className={`badge ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-base-content/70">
                        <p>
                          <strong>Amount:</strong> {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p>
                          <strong>Booking:</strong> {payment.bookingId?.substring(0, 8)}...
                          {payment.booking && ` (${payment.booking.bookingType})`}
                        </p>
                        {payment.paymentMethod?.type && (
                          <p>
                            <strong>Method:</strong> {payment.paymentMethod.type}
                          </p>
                        )}
                        {payment.transactionReference && (
                          <p>
                            <strong>Transaction:</strong> {payment.transactionReference}
                          </p>
                        )}
                        {payment.invoiceUrl && (
                          <p>
                            <strong>Invoice:</strong>{' '}
                            <a href={payment.invoiceUrl} className="link link-primary" target="_blank" rel="noreferrer">
                              View
                            </a>
                          </p>
                        )}
                        <p>
                          <strong>Created:</strong> {formatDate(payment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {payment.status === 'PENDING' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleProcessPayment(payment.id)}
                          disabled={processing[payment.id]}
                        >
                          {processing[payment.id] ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            'Process Payment'
                          )}
                        </button>
                      )}
                      {payment.status === 'SUCCEEDED' && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleRefundPayment(payment.id)}
                          disabled={processing[`refund-${payment.id}`]}
                        >
                          {processing[`refund-${payment.id}`] ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            'Refund'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {bookingFromState?.bookingId ? 'Complete Payment' : 'Create New Payment'}
              </h3>
              {bookingFromState?.bookingId && (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    navigate('/bookings');
                  }}
                >
                  <FaArrowLeft /> Back
                </button>
              )}
            </div>

            {bookingFromState?.bookingId && (
              <div className="alert alert-info mb-4">
                <FaCheckCircle />
                <div>
                  <h4 className="font-semibold">Booking Created!</h4>
                  <p className="text-sm">Please complete payment to confirm your booking.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreatePayment}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Booking</span>
                </label>
                {bookingFromState?.bookingId ? (
                  <input
                    type="text"
                    className="input input-bordered"
                    value={bookingFromState.bookingId}
                    disabled
                  />
                ) : (
                  <select
                    className="select select-bordered"
                    value={newPayment.bookingId}
                    onChange={(e) => setNewPayment({ ...newPayment, bookingId: e.target.value })}
                    required
                  >
                    <option value="">Select a booking</option>
                    {bookings.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {booking.bookingType} - {formatCurrency(booking.price?.amount || 0, booking.price?.currency || 'USD')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Amount</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input input-bordered"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  required
                  disabled={!!bookingFromState?.bookingId}
                />
              </div>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Currency</span>
                </label>
                <select
                  className="select select-bordered"
                  value={newPayment.currency}
                  onChange={(e) => setNewPayment({ ...newPayment, currency: e.target.value })}
                  disabled={!!bookingFromState?.bookingId}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              {bookingFromState?.bookingId && (
                <>
                  <div className="divider">Payment Method</div>
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text"><FaCreditCard className="inline mr-2" />Card Number <span className="text-error">*</span></span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`input input-bordered ${paymentErrors.cardNumber ? 'input-error' : ''}`}
                      placeholder="1234 5678 9012 3456"
                      value={paymentMethod.cardNumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '').slice(0, 19);
                        const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                        setPaymentMethod({ ...paymentMethod, cardNumber: formatted });
                        clearPaymentError('cardNumber');
                      }}
                      maxLength={23}
                      required
                    />
                    {paymentErrors.cardNumber && (
                      <label className="label">
                        <span className="label-text-alt text-error">{paymentErrors.cardNumber}</span>
                      </label>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Expiry Date <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`input input-bordered ${paymentErrors.expiryDate ? 'input-error' : ''}`}
                        placeholder="MM/YY"
                        value={paymentMethod.expiryDate}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          if (value.length >= 3) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                          }
                          setPaymentMethod({ ...paymentMethod, expiryDate: value });
                          clearPaymentError('expiryDate');
                        }}
                        maxLength={5}
                        required
                      />
                      {paymentErrors.expiryDate && (
                        <label className="label">
                          <span className="label-text-alt text-error">{paymentErrors.expiryDate}</span>
                        </label>
                      )}
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">CVV <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`input input-bordered ${paymentErrors.cvv ? 'input-error' : ''}`}
                        placeholder="123"
                        value={paymentMethod.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPaymentMethod({ ...paymentMethod, cvv: value });
                          clearPaymentError('cvv');
                        }}
                        maxLength={4}
                        required
                      />
                      {paymentErrors.cvv && (
                        <label className="label">
                          <span className="label-text-alt text-error">{paymentErrors.cvv}</span>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Cardholder Name <span className="text-error">*</span></span>
                    </label>
                    <input
                      type="text"
                      className={`input input-bordered ${paymentErrors.cardholderName ? 'input-error' : ''}`}
                      placeholder="John Doe"
                      value={paymentMethod.cardholderName}
                      onChange={(e) => {
                        setPaymentMethod({ ...paymentMethod, cardholderName: e.target.value });
                        clearPaymentError('cardholderName');
                      }}
                      required
                    />
                    {paymentErrors.cardholderName && (
                      <label className="label">
                        <span className="label-text-alt text-error">{paymentErrors.cardholderName}</span>
                      </label>
                    )}
                  </div>
                </>
              )}

              <div className="modal-action">
                <button type="button" className="btn" onClick={resetPaymentForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={processing.create}>
                  {processing.create ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : bookingFromState?.bookingId ? (
                    <>
                      <FaCreditCard className="mr-2" /> Pay Now
                    </>
                  ) : (
                    'Create Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={resetPaymentForm}></div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
