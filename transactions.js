module.exports = (pool) => {
  const router = require('express').Router();

  // === OBTENER TRANSACCIONES ===
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT amount, type, category, date, description FROM transacciones ORDER BY date DESC'
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error GET /transactions:', err.message);
      res.status(500).json({ error: 'Error al obtener transacciones' });
    }
  });

  // === AGREGAR TRANSACCIÓN (CON VALIDACIONES FUERTES) ===
  router.post('/', async (req, res) => {
    let { amount, type, category, date, description } = req.body;

    // Validaciones estrictas para evitar el error 500
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'El monto debe ser un número positivo' });
    }
    amount = parseFloat(amount).toFixed(2);

    if (!type || !['ingreso', 'gasto'].includes(type)) {
      return res.status(400).json({ error: 'Tipo debe ser "ingreso" o "gasto"' });
    }

    if (!date || date.trim() === '') {
      return res.status(400).json({ error: 'La fecha es obligatoria' });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'La descripción es obligatoria' });
    }

    try {
      await pool.query(
        `INSERT INTO transacciones 
         (amount, type, category, date, description) 
         VALUES ($1, $2, $3, $4, $5)`,
        [amount, type, category || null, date, description.trim()]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('ERROR INSERT transacción:', err.message);
      console.error('Datos recibidos:', req.body);
      res.status(500).json({ 
        error: 'Error al guardar transacción', 
        details: err.message 
      });
    }
  });

  return router;
};