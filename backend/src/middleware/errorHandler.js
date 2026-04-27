import mongoose from 'mongoose';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: 'Validation error', details: err.errors });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ message: `Duplicate value for ${field}` });
  }
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  return res.status(status).json({ message });
}
