const express = require('express');
const app = express();

// Map structure: userId -> Array of timestamps (in milliseconds)
const userRequests = new Map();

const RATE_LIMIT_MS = 5000; // 5-second window
const MAX_REQUESTS_PER_USER = 5;

setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userRequests.entries()) {
    const validTimestamps = timestamps.filter(time => now - time < RATE_LIMIT_MS);
    if (validTimestamps.length === 0) {
      // More than 5s from last request, we reset the user status
      userRequests.delete(userId);
    } else {
      // We save a new user request timestamp
      userRequests.set(userId, validTimestamps);
    }
  }
}, 60 * 1000);

const rateLimiter = (req, res, next) => {
  const userId = req.headers['userid'];

  if (!userId) {
    return res.status(400).json({ error: 'User identifier header is missing.' });
  }

  const now = Date.now();
  const timestamps = userRequests.get(userId) || [];

  const currentWindowTimestamps = timestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_MS
  );

  if (currentWindowTimestamps.length >= MAX_REQUESTS_PER_USER) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
    });
  }
  // Record the current request timestamp
  currentWindowTimestamps.push(now);
  userRequests.set(userId, currentWindowTimestamps);

  next();
};

app.use(rateLimiter);

// This is the endpoint to use!
app.get('/status', (req, res) => {
  res.json({
    currentDateTime: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
