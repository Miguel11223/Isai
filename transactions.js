module.exports = (pool) => {
  const router = require('express').Router();

  // Obtener transacciones
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT amount, type, category, date, description FROM transacciones ORDER BY date DESC');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al obtener transacciones' });
    }
  });

  // Agregar transacción
  router.post('/', async (req, res) => {
    const { amount, type, category, date, description } = req.body;
    try {
      await pool.query(
        'INSERT INTO transacciones (amount, type, category, date, description) VALUES ($1, $2, $3, $4, $5)',
        [amount, type, category, date, description]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar transacción' });
    }
  });

  return router;
};