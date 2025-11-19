const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', 
  port: 3306,
  database: 'tarjeta_debito'
});

db.connect(err => {
  if (err) throw err;
  console.log('Conectado a MySQL');
});

// Rutas
app.use('/auth', authRoutes(db, jwt));
app.use('/transactions', transactionRoutes(db, jwt));

// Iniciar servidor
app.listen(3000, () => console.log('Servidor en puerto 3000'));