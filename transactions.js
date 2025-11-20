module.exports = (pool, JWT_SECRET) => {
  const router = require('express').Router();
  const jwt = require('jsonwebtoken');

  const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Token inválido' });
    }
  };

  router.get('/', verifyToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT amount, type, category, date, description FROM transacciones WHERE user_id = (SELECT id FROM usuarios WHERE username = $1)', [req.user.username]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener transacciones' });
    }
  });

  router.post('/', verifyToken, async (req, res) => {
    const { amount, type, category, date, description } = req.body;
    try {
      await pool.query(
        'INSERT INTO transacciones (user_id, amount, type, category, date, description) VALUES ((SELECT id FROM usuarios WHERE username = $1), $2, $3, $4, $5, $6)',
        [req.user.username, amount, type, category, date, description]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Error al guardar transacción' });
    }
  });

  return router;
};