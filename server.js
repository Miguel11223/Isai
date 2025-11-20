const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === CONEXIÓN CORRECTA A TIDB CLOUD (SIN PROMISE, SIN OPCIONES INVÁLIDAS) ===
const db = mysql.createConnection({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    rejectUnauthorized: false  // ← ESTO ES LA CLAVE para Render
  }
});

db.connect((err) => {
  if (err) {
    console.error('Error conectando a TiDB:', err);
    process.exit(1);
  }
  console.log('¡Conectado a TiDB Cloud exitosamente!');
});

// Rutas
app.use('/auth', authRoutes(db, jwt));
app.use('/transactions', transactionRoutes(db, jwt));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`URL: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}`);
});