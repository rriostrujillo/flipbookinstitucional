export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size is 50MB' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Invalid reference' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};
