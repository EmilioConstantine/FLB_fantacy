// src/data/dataSource.js

// For now, use the fake in-memory data.
const fakeDataSource = require('./fakeDataSource');

// In the future you can do:
// const sqlDataSource = require('./sqlDataSource');
// const mode = process.env.DATA_MODE || 'FAKE';
// module.exports = mode === 'SQL' ? sqlDataSource : fakeDataSource;

module.exports = fakeDataSource;
