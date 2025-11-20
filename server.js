const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === CONEXIÓN CON VARIABLES DE ENTORNO (OBLIGATORIO EN RENDER) ===
const db = mysql.createConnection({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true  // TiDB Cloud requiere esto
  }
});

db.connect(err => {
  if (err) {
    console.error('Error conectando a TiDB:', err);
    process.exit(1); // Para que Render reinicie si falla
  } else {
    console.log('¡Conectado a TiDB Cloud correctamente!');
  }
});

// Rutas
app.use('/auth', authRoutes(db, jwt));
app.use('/transactions', transactionRoutes(db, jwt));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));