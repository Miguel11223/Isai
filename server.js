const express = require('express');
const mysql = require('mysql2'); // ← VUELVE A mysql2 normal (no promise)
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === CONEXIÓN QUE FUNCIONA EN RENDER CON TIDB CLOUD ===
const db = mysql.createConnection({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    rejectUnauthorized: false   // ← ESTO ES LA CLAVE
  },
  connectTimeout: 30000
});

db.connect((err) => {
  if (err) {
    console.error('ERROR conectando a TiDB:', err.code, err.message);
    process.exit(1);
  }
  console.log('¡CONECTADO A TIDB CLOUD CORRECTAMENTE!');
});

// Rutas
app.use('/auth', authRoutes(db, jwt));
app.use('/transactions', transactionRoutes(db, jwt));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`URL: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}`);
});