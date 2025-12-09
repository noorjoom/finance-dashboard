const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all savings goals for the authenticated user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY target_date NULLS LAST, created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific savings goal
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching savings goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new savings goal
router.post('/', async (req, res) => {
  try {
    const { goal_name, target_amount, current_amount, target_date } = req.body;

    if (!goal_name || target_amount === undefined) {
      return res.status(400).json({ error: 'Goal name and target amount are required' });
    }

    if (target_amount <= 0) {
      return res.status(400).json({ error: 'Target amount must be greater than 0' });
    }

    const result = await pool.query(
      'INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, goal_name, target_amount, current_amount || 0, target_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating savings goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a savings goal
router.put('/:id', async (req, res) => {
  try {
    const { goal_name, target_amount, current_amount, target_date } = req.body;

    // First check if goal exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM savings_goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    if (target_amount !== undefined && target_amount <= 0) {
      return res.status(400).json({ error: 'Target amount must be greater than 0' });
    }

    const result = await pool.query(
      'UPDATE savings_goals SET goal_name = COALESCE($1, goal_name), target_amount = COALESCE($2, target_amount), current_amount = COALESCE($3, current_amount), target_date = COALESCE($4, target_date), updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
      [goal_name, target_amount, current_amount, target_date, req.params.id, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating savings goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a savings goal
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    res.json({ message: 'Savings goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

