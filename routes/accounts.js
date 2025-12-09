const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all accounts for the authenticated user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific account
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new account
router.post('/', async (req, res) => {
  try {
    const { account_name, balance, account_type } = req.body;

    if (!account_name || !account_type) {
      return res.status(400).json({ error: 'Account name and type are required' });
    }

    const result = await pool.query(
      'INSERT INTO accounts (user_id, account_name, balance, account_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, account_name, balance || 0, account_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an account
router.put('/:id', async (req, res) => {
  try {
    const { account_name, balance, account_type } = req.body;

    // First check if account exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const result = await pool.query(
      'UPDATE accounts SET account_name = COALESCE($1, account_name), balance = COALESCE($2, balance), account_type = COALESCE($3, account_type), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
      [account_name, balance, account_type, req.params.id, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an account
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

