module.exports = (pool, JWT_SECRET) => {
  const router = require('express').Router();

  // Registro
  router.post('/register', async (req, res) => {
    const { username, password, fullName } = req.body;
    if (!username || !password || !fullName || password.length < 6) {
      return res.status(400).json({ error: 'Datos incompletos o contraseña corta' });
    }

    try {
      const check = await pool.query('SELECT username FROM usuarios WHERE username = $1', [username]);
      if (check.rows.length > 0) return res.status(400).json({ error: 'Usuario ya existe' });

      // Generar datos de tarjeta
      const cardNumber = `${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
      const cvv = Math.floor(100 + Math.random() * 900).toString();
      const year = 28 + Math.floor(Math.random() * 5); // 2028-2032
      const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
      const expiryDate = `${month}/${year}`;

      await pool.query(
        'INSERT INTO usuarios (username, password, full_name, card_number, cvv, expiry_date) VALUES ($1, $2, $3, $4, $5, $6)',
        [username, password, fullName, cardNumber, cvv, expiryDate]
      );

      const token = jwt.sign({ username, fullName, cardNumber, cvv, expiryDate }, JWT_SECRET);
      res.json({ success: true, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
      if (result.rows.length === 0 || result.rows[0].password !== password) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }
      const user = result.rows[0];
      const token = jwt.sign({
        username: user.username,
        fullName: user.full_name,
        cardNumber: user.card_number,
        cvv: user.cvv,
        expiryDate: user.expiry_date
      }, JWT_SECRET);
      res.json({ success: true, token });
    } catch (err) {
      res.status(500).json({ error: 'Error en el servidor' });
    }
  });

  return router;
};