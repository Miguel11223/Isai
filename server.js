const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
  if (err) {
    console.error('Error conectando a Neon:', err.message);
    process.exit(1);
  }
  console.log('CONECTADO A NEON.TECH SIN JWT');
});

// === RUTAS SIN AUTENTICACIÓN ===
app.post('/auth/register', async (req, res) => {
  const { username, password, fullName } = req.body;
  if (!username || !password || !fullName || password.length < 6) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    const check = await pool.query('SELECT username FROM usuarios WHERE username = $1', [username]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Usuario ya existe' });

    const cardNumber = `${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
    const cvv = Math.floor(100 + Math.random() * 900).toString();
    const year = 28 + Math.floor(Math.random() * 5);
    const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const expiryDate = `${month}/${year}`;

    await pool.query(
      'INSERT INTO usuarios (username, password, full_name, card_number, cvv, expiry_date) VALUES ($1, $2, $3, $4, $5, $6)',
      [username, password, fullName, cardNumber, cvv, expiryDate]
    );

    res.json({ success: true, user: { fullName, cardNumber, cvv, expiryDate } });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0 || result.rows[0].password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const user = result.rows[0];
    res.json({ success: true, user: { fullName: user.full_name, cardNumber: user.card_number, cvv: user.cvv, expiryDate: user.expiry_date } });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/transactions', async (req, res) => {
  try {
    console.log('Obteniendo transacciones...');
    const result = await pool.query('SELECT amount, type, category, date, description FROM transacciones ORDER BY date DESC');
    console.log('Transacciones encontradas:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener transacciones:', err);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

app.post('/transactions', async (req, res) => {
  console.log('Datos recibidos para transaccion:', req.body);
  const { amount, type, category, date, description } = req.body;
  
  // Validaciones
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo' });
  }
  
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
    const parsedAmount = parseFloat(amount).toFixed(2);
    
    await pool.query(
      'INSERT INTO transacciones (amount, type, category, date, description) VALUES ($1, $2, $3, $4, $5)',
      [parsedAmount, type, category || 'general', date, description.trim()]
    );
    
    console.log('Transaccion guardada exitosamente');
    res.json({ success: true, message: 'Transacción agregada correctamente' });
  } catch (err) {
    console.error('Error al guardar transaccion:', err);
    res.status(500).json({ 
      error: 'Error al guardar transacción', 
      details: err.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));