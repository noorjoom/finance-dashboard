const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all transactions for the authenticated user with optional filters
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, category_id, account_id, transaction_type } = req.query;
    
    let query = 'SELECT t.*, a.account_name, c.category_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1';
    const params = [req.user.userId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND t.transaction_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND t.transaction_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (category_id) {
      query += ` AND t.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    if (account_id) {
      query += ` AND t.account_id = $${paramIndex}`;
      params.push(account_id);
      paramIndex++;
    }

    if (transaction_type) {
      query += ` AND t.transaction_type = $${paramIndex}`;
      params.push(transaction_type);
      paramIndex++;
    }

    query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recurring transactions
router.get('/recurring', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT t.*, a.account_name, c.category_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 AND t.is_recurring = true ORDER BY t.transaction_date DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific transaction
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT t.*, a.account_name, c.category_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = $1 AND t.user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new transaction
router.post('/', async (req, res) => {
  try {
    const { account_id, category_id, transaction_date, description, amount, transaction_type, is_recurring } = req.body;

    if (!account_id || !transaction_date || !amount || !transaction_type) {
      return res.status(400).json({ error: 'Account ID, date, amount, and transaction type are required' });
    }

    if (!['Income', 'Expense'].includes(transaction_type)) {
      return res.status(400).json({ error: 'Transaction type must be either Income or Expense' });
    }

    // Verify account belongs to user
    const accountCheck = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [account_id, req.user.userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Start transaction to update account balance
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert transaction
      const transactionResult = await client.query(
        'INSERT INTO transactions (user_id, account_id, category_id, transaction_date, description, amount, transaction_type, is_recurring) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [req.user.userId, account_id, category_id, transaction_date, description, amount, transaction_type, is_recurring || false]
      );

      // Update account balance
      const balanceChange = transaction_type === 'Income' ? amount : -amount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [balanceChange, account_id]
      );

      await client.query('COMMIT');

      const result = await pool.query(
        'SELECT t.*, a.account_name, c.category_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = $1',
        [transactionResult.rows[0].id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a transaction
router.put('/:id', async (req, res) => {
  try {
    const { account_id, category_id, transaction_date, description, amount, transaction_type, is_recurring } = req.body;

    // Get existing transaction
    const existingTransaction = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const oldTransaction = existingTransaction.rows[0];

    // If amount or type changed, we need to update account balance
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Revert old balance change
      const oldBalanceChange = oldTransaction.transaction_type === 'Income' ? -oldTransaction.amount : oldTransaction.amount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
        [oldBalanceChange, oldTransaction.account_id]
      );

      // Update transaction
      const newAmount = amount !== undefined ? amount : oldTransaction.amount;
      const newType = transaction_type || oldTransaction.transaction_type;
      const newAccountId = account_id || oldTransaction.account_id;

      await client.query(
        'UPDATE transactions SET account_id = COALESCE($1, account_id), category_id = COALESCE($2, category_id), transaction_date = COALESCE($3, transaction_date), description = COALESCE($4, description), amount = COALESCE($5, amount), transaction_type = COALESCE($6, transaction_type), is_recurring = COALESCE($7, is_recurring), updated_at = CURRENT_TIMESTAMP WHERE id = $8',
        [account_id, category_id, transaction_date, description, amount, transaction_type, is_recurring, req.params.id]
      );

      // Apply new balance change
      const newBalanceChange = newType === 'Income' ? newAmount : -newAmount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
        [newBalanceChange, newAccountId]
      );

      await client.query('COMMIT');

      const result = await pool.query(
        'SELECT t.*, a.account_name, c.category_name FROM transactions t LEFT JOIN accounts a ON t.account_id = a.id LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = $1',
        [req.params.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    // Get transaction to revert balance change
    const transaction = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const t = transaction.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Revert balance change
      const balanceChange = t.transaction_type === 'Income' ? -t.amount : t.amount;
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
        [balanceChange, t.account_id]
      );

      // Delete transaction
      await client.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);

      await client.query('COMMIT');

      res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

