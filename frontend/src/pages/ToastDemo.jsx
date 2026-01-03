import { useToast } from '../hooks/useToast';

/**
 * Toast Demo Page
 * Demonstrates the toast notification system
 */
const ToastDemo = () => {
  const toast = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Toast Notifications Demo
          </h1>
          <p className="text-gray-600 mb-8">
            Click the buttons below to see beautiful toast notifications
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Success Toasts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Success</h2>
              
              <button
                onClick={() => toast.showSuccess('Booking created successfully!')}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Booking Success
              </button>

              <button
                onClick={() => toast.showSuccess('Payment processed successfully!')}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Payment Success
              </button>

              <button
                onClick={() => toast.showSuccess('Profile updated!', 3000)}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Quick Success (3s)
              </button>
            </div>

            {/* Error Toasts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Error</h2>
              
              <button
                onClick={() => toast.showError('Failed to process payment')}
                className="w-full px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Payment Error
              </button>

              <button
                onClick={() => toast.showError('Network connection lost')}
                className="w-full px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Network Error
              </button>

              <button
                onClick={() => toast.showError('Invalid credentials', 7000)}
                className="w-full px-6 py-3 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Auth Error (7s)
              </button>
            </div>

            {/* Warning Toasts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Warning</h2>
              
              <button
                onClick={() => toast.showWarning('Session expires in 5 minutes')}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Session Warning
              </button>

              <button
                onClick={() => toast.showWarning('Please verify your email')}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Verification Warning
              </button>

              <button
                onClick={() => toast.showWarning('Low balance alert')}
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Balance Warning
              </button>
            </div>

            {/* Info Toasts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Info</h2>
              
              <button
                onClick={() => toast.showInfo('New deals available!')}
                className="w-full px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Deals Info
              </button>

              <button
                onClick={() => toast.showInfo('Your watch has been triggered')}
                className="w-full px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Watch Info
              </button>

              <button
                onClick={() => toast.showInfo('Welcome to Kayak!')}
                className="w-full px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Welcome Info
              </button>
            </div>
          </div>

          {/* Multiple Toasts Demo */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Multiple Toasts</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  toast.showInfo('Processing your request...');
                  setTimeout(() => toast.showSuccess('Request completed!'), 2000);
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-400 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Sequential Toasts
              </button>

              <button
                onClick={() => {
                  toast.showSuccess('Success 1');
                  toast.showError('Error 1');
                  toast.showWarning('Warning 1');
                  toast.showInfo('Info 1');
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-400 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Multiple Toasts
              </button>

              <button
                onClick={() => toast.clearAll()}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Usage Example */}
          <div className="mt-8 bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Usage Example</h3>
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`import { useToast } from '@/hooks/useToast';

const MyComponent = () => {
  const toast = useToast();

  const handleSubmit = async () => {
    try {
      await submitForm();
      toast.showSuccess('Form submitted successfully!');
    } catch (error) {
      toast.showError('Failed to submit form');
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
};`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToastDemo;

