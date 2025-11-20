const express = require('express');
const { Pool } = require('pg'); // PostgreSQL (Neon)
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === JWT_SECRET OBLIGATORIO ===
const JWT_SECRET = process.env.JWT_SECRET || 'miguel2025_seguro_cambia_esto_en_produccion';

// === CONEXIÓN A NEON (PostgreSQL) ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
  if (err) {
    console.error('Error conectando a Neon:', err.message);
    process.exit(1);
  }
  console.log('¡CONECTADO A NEON.TECH!');
});

// Rutas (pasamos pool y JWT_SECRET)
app.use('/auth', authRoutes(pool, JWT_SECRET));
app.use('/transactions', transactionRoutes(pool, JWT_SECRET));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));