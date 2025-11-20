const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === CONEXIÓN A NEON (PostgreSQL) ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
  if (err) {
    console.error('Error conectando a Neon:', err);
    process.exit(1);
  }
  console.log('¡CONECTADO A NEON.TECH!');
});

// Rutas
app.use('/auth', authRoutes(pool, jwt));
app.use('/transactions', transactionRoutes(pool, jwt));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));