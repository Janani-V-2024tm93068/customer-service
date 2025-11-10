const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8081;

// Middleware to parse JSON body
app.use(bodyParser.json());

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// ✅ Health Check Endpoint for Kubernetes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Basic test route
app.get('/', (req, res) => res.send('Customer Service running ✅'));

// DB connection check route
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`✅ DB FOR CUSTOMER SERVICE Connected! Server time now: ${result.rows[0].now}`);
  } catch (err) {
    res.status(500).send('❌ DB connection failed: ' + err.message);
  }
});

// ---------------------------
// CRUD ENDPOINTS
// ---------------------------

// CREATE a new customer
app.post('/customers', async (req, res) => {
  const { name, email, phone, kyc_status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, email, phone, kyc_status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone, kyc_status || false]
    );
    res.status(201).json({ message: '✅ Customer added successfully', customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ all customers
app.get('/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY customer_id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ one customer by ID
app.get('/customers/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE customer_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE customer by ID
app.put('/customers/:id', async (req, res) => {
  const { name, email, phone, kyc_status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE customers SET name=$1, email=$2, phone=$3, kyc_status=$4 WHERE customer_id=$5 RETURNING *',
      [name, email, phone, kyc_status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: '✅ Customer updated successfully', customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer by ID
app.delete('/customers/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM customers WHERE customer_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: '🗑️ Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => console.log(`🚀 Customer Service running on port ${port}`));
