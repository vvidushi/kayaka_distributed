/**
 * Catch Async utility
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;

