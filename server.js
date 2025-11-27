const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static('public'));

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

// Ruta principal para servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para servir manifest.json
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Ruta para servir favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // Respuesta vacía sin error
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

    const userResult = await pool.query(
      'INSERT INTO usuarios (username, password, full_name, card_number, cvv, expiry_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [username, password, fullName, cardNumber, cvv, expiryDate]
    );

    const userId = userResult.rows[0].id;

    res.json({ 
      success: true, 
      user: { 
        id: userId,
        fullName, 
        cardNumber, 
        cvv, 
        expiryDate 
      } 
    });
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
    res.json({ 
      success: true, 
      user: { 
        id: user.id,
        fullName: user.full_name, 
        cardNumber: user.card_number, 
        cvv: user.cvv, 
        expiryDate: user.expiry_date 
      } 
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.get('/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log('Obteniendo transacciones para usuario:', userId);
    const result = await pool.query(`
      SELECT amount, type, category, date, description 
      FROM transacciones 
      WHERE user_id = $1
      ORDER BY date DESC
    `, [userId]);
    
    console.log('Transacciones encontradas:', result.rows.length);
    
    // Normalizar los datos para el frontend
    const normalizedTransactions = result.rows.map(transaction => ({
      ...transaction,
      type: transaction.type.toLowerCase().replace('íngreso', 'ingreso'),
      category: transaction.category || 'general'
    }));
    
    res.json(normalizedTransactions);
  } catch (err) {
    console.error('Error al obtener transacciones:', err);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

app.post('/transactions', async (req, res) => {
  console.log('Datos recibidos para transaccion:', req.body);
  const { amount, type, category, date, description, userId } = req.body;
  
  // Validaciones
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número positivo' });
  }
  
  if (!userId) {
    return res.status(400).json({ error: 'ID de usuario requerido' });
  }
  
  // Normalizar el tipo (manejar "Íngreso" con acento)
  const normalizedType = type.toLowerCase().replace('íngreso', 'ingreso');
  if (!normalizedType || !['ingreso', 'gasto'].includes(normalizedType)) {
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
    const normalizedCategory = (category || 'general').toLowerCase();
    
    console.log('Insertando transaccion para usuario:', userId);
    console.log('- Amount:', parsedAmount);
    console.log('- Type:', normalizedType);
    console.log('- Category:', normalizedCategory);
    console.log('- Date:', date);
    console.log('- Description:', description.trim());
    
    const result = await pool.query(
      `INSERT INTO transacciones (amount, type, category, date, description, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, amount, type, category, date, description`,
      [parsedAmount, normalizedType, normalizedCategory, date, description.trim(), userId]
    );
    
    console.log('Transaccion guardada exitosamente:', result.rows[0]);
    res.json({ 
      success: true, 
      message: 'Transacción agregada correctamente',
      transaction: result.rows[0]
    });
  } catch (err) {
    console.error('Error al guardar transaccion:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      error: 'Error al guardar transacción', 
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));