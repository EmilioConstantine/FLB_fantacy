// src/middleware/requireAdmin.js

// For now, this just lets everything through.
// Later you can check req.user or a token.
function requireAdmin(req, res, next) {
  // Example: if you want a quick protection, require a header:
  // if (req.headers['x-admin-key'] !== 'secret') {
  //   return res.status(403).json({ error: 'Admin only' });
  // }
  next();
}

module.exports = requireAdmin;
