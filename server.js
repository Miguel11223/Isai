const express = require('express');
const { Pool } = require('pg'); // ← PostgreSQL driver
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === CONEXIÓN A NEON.TECH (PostgreSQL) ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ← Usa la connection string completa
  ssl: {
    rejectUnauthorized: false
  }
});

// Prueba conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error conectando a Neon:', err);
    process.exit(1);
  }
  console.log('¡CONECTADO A NEON.TECH!');
  release();
});

// Rutas (cambia db.query por pool.query en auth.js y transactions.js)
app.use('/auth', authRoutes(pool, jwt));
app.use('/transactions', transactionRoutes(pool, jwt));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));