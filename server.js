const express = require('express');
const mysql = require('mysql2/promise'); // ← Promise version
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === CONFIGURACIÓN LIMPIA PARA TIDB CLOUD (sin opciones inválidas) ===
const dbConfig = {
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || '4000'),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  // ← Eliminamos acquireTimeout y timeout (causaban el error)
  connectTimeout: 10000
};

// Conexión con retry
async function connectWithRetry() {
  for (let i = 0; i < 10; i++) { // Aumenté a 10 intentos
    try {
      const connection = await mysql.createConnection(dbConfig);
      console.log('¡Conectado a TiDB Cloud exitosamente!');
      return connection;
    } catch (err) {
      console.error(`Intento ${i + 1}/10 fallido:`, err.message);
      if (i === 9) throw err;
      await new Promise(res => setTimeout(res, 8000)); // Espera 8 segundos
    }
  }
}

// Iniciar servidor
connectWithRetry()
  .then(db => {
    app.use('/auth', authRoutes(db, jwt));
    app.use('/transactions', transactionRoutes(db, jwt));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('ERROR FATAL: No se pudo conectar a TiDB Cloud', err);
    process.exit(1);
  });