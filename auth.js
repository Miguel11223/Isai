module.exports = (pool, jwt) => {
  const router = require('express').Router();
  const SECRET_KEY = 'tu_secreto_jwt'; 

  // Generar número de tarjeta único (XXXX XXXX XXXX XXXX)
  function generateCardNumber() {
    const digits = () => Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${digits()} ${digits()} ${digits()} ${digits()}`;
  }

  // Generar CVV (3 dígitos)
  function generateCvv() {
    return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  // Generar fecha de vencimiento (MM/AA, entre 2028 y 2032)
  function generateExpiryDate() {
    const year = Math.floor(2028 + Math.random() * 5); // 2028 to 2032
    const month = Math.floor(1 + Math.random() * 12).toString().padStart(2, '0');
    return `${month}/${year.toString().slice(-2)}`;
  }

  // Verificar unicidad del número de tarjeta
  async function isCardNumberUnique(cardNumber) {
    return new Promise((resolve, reject) => {
      pool.query('SELECT card_number FROM usuarios WHERE card_number = ?', [cardNumber], (err, results) => {
        if (err) reject(err);
        resolve(results.length === 0);
      });
    });
  }

  // Registro
  router.post('/register', async (req, res) => {
    const { username, password, fullName } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar unicidad de username
    pool.query('SELECT username FROM usuarios WHERE username = ?', [username], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Error en el servidor' });
      if (results.length > 0) return res.status(400).json({ error: 'El usuario ya existe' });

      // Generar datos de tarjeta
      try {
        let cardNumber;
        let attempts = 0;
        const maxAttempts = 10; // Limitar intentos para evitar bucle infinito
        do {
          if (attempts >= maxAttempts) {
            return res.status(500).json({ error: 'No se pudo generar un número de tarjeta único' });
          }
          cardNumber = generateCardNumber();
          attempts++;
        } while (!(await isCardNumberUnique(cardNumber)));

        const cvv = generateCvv();
        const expiryDate = generateExpiryDate();

        pool.query(
          'INSERT INTO usuarios (username, password, full_name, card_number, cvv, expiry_date) VALUES (?, ?, ?, ?, ?, ?)',
          [username, password, fullName, cardNumber, cvv, expiryDate],
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: 'Error al registrar' });
            }
            const token = jwt.sign({ username, fullName, cardNumber, cvv, expiryDate }, SECRET_KEY);
            res.json({ success: true, token });
          }
        );
      } catch (err) {
        res.status(500).json({ error: 'Error al generar datos de tarjeta' });
      }
    });
  });

  // Login
  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    pool.query('SELECT * FROM usuarios WHERE username = ?', [username], (err, results) => {
      if (err || results.length === 0 || results[0].password !== password) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }
      const token = jwt.sign(
        {
          username: results[0].username,
          fullName: results[0].full_name,
          cardNumber: results[0].card_number,
          cvv: results[0].cvv,
          expiryDate: results[0].expiry_date
        },
        SECRET_KEY
      );
      res.json({ success: true, token });
    });
  });

  return router;
};