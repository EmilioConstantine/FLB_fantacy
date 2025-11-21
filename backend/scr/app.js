// src/app.js

const express = require('express');
const cors = require('cors');

const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Simple health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Lebanese Fantasy Basketball backend' });
});

// Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res
    .status(status)
    .json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
