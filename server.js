const express = require('express');
const mysql = require('mysql2/promise'); // ← Usamos promise para mejor manejo
const jwt = require('jsonwebtoken');
const cors = require('cors');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactions');

const app = express();
app.use(cors());
app.use(express.json());

// === CONEXIÓN CON VARIABLES DE ENTORNO (OBLIGATORIO EN RENDER) ===
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
  connectTimeout: 10000,
  acquireTimeout: 10000,
  timeout: 10000,
};

// Prueba de conexión con retry
async function connectWithRetry() {
  for (let i = 0; i < 5; i++) {
    try {
      const connection = await mysql.createConnection(dbConfig);
      console.log('¡Conectado a TiDB Cloud exitosamente!');
      return connection;
    } catch (err) {
      console.error(`Intento ${i + 1} fallido:`, err.message);
      if (i === 4) {
        console.error('No se pudo conectar a TiDB después de 5 intentos');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 5000)); // espera 5 segundos
    }
  }
}

// Conectar
connectWithRetry().then(db => {
  // Rutas
  app.use('/auth', authRoutes(db, jwt));
  app.use('/transactions', transactionRoutes(db, jwt));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`URL: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'tu-app.onrender.com'}`);
  });
}).catch(err => {
  console.error('Error fatal al conectar a la base de datos:', err);
  process.exit(1);
});