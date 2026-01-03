export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId || req.id
  });
};

