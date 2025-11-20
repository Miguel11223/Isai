module.exports = (pool, jwt) => {
  const router = require('express').Router();
  const SECRET_KEY = 'tu_secreto_jwt'; // Igual que en auth.js

  // Middleware para verificar token
  const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
      req.user = jwt.verify(token, SECRET_KEY);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Token inválido' });
    }
  };

  // Obtener transacciones
  router.get('/', verifyToken, (req, res) => {
    pool.query('SELECT id, amount, type, category, date, description FROM transacciones WHERE user_id = (SELECT id FROM usuarios WHERE username = ?)', [req.user.username], (err, results) => {
      if (err) return res.status(500).json({ error: 'Error en el servidor' });
      res.json(results);
    });
  });

  // Agregar transacción
  router.post('/', verifyToken, (req, res) => {
    const { amount, type, category, date, description } = req.body;
    if (!amount || amount <= 0 || !type || !category || !date || !description) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    pool.query('INSERT INTO transacciones (user_id, amount, type, category, date, description) VALUES ((SELECT id FROM usuarios WHERE username = ?), ?, ?, ?, ?, ?)', 
      [req.user.username, amount, type, category, date, description], (err) => {
        if (err) return res.status(500).json({ error: 'Error al guardar transacción' });
        res.json({ success: true });
      });
  });

  return router;
};