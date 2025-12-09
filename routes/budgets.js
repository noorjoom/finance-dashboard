const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all budgets for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let query = 'SELECT b.*, c.category_name FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.user_id = $1';
    const params = [req.user.userId];

    if (month) {
      query += ' AND b.budget_month = $2';
      params.push(month);
      if (year) {
        query += ' AND b.budget_year = $3';
        params.push(year);
      }
    } else if (year) {
      query += ' AND b.budget_year = $2';
      params.push(year);
    }

    query += ' ORDER BY b.budget_year DESC, b.budget_month DESC, c.category_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific budget
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT b.*, c.category_name FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.id = $1 AND b.user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new budget
router.post('/', async (req, res) => {
  try {
    const { category_id, budget_month, budget_year, budget_amount } = req.body;

    if (!category_id || !budget_month || !budget_year || budget_amount === undefined) {
      return res.status(400).json({ error: 'Category ID, month, year, and budget amount are required' });
    }

    if (budget_month < 1 || budget_month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }

    // Verify category exists and belongs to user (or is default)
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [category_id, req.user.userId]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const result = await pool.query(
      'INSERT INTO budgets (user_id, category_id, budget_month, budget_year, budget_amount) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, category_id, budget_month, budget_year, budget_amount]
    );

    const budgetWithCategory = await pool.query(
      'SELECT b.*, c.category_name FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.id = $1',
      [result.rows[0].id]
    );

    res.status(201).json(budgetWithCategory.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Budget already exists for this category, month, and year' });
    }
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a budget
router.put('/:id', async (req, res) => {
  try {
    const { category_id, budget_month, budget_year, budget_amount } = req.body;

    // First check if budget exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM budgets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    if (budget_month && (budget_month < 1 || budget_month > 12)) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }

    const result = await pool.query(
      'UPDATE budgets SET category_id = COALESCE($1, category_id), budget_month = COALESCE($2, budget_month), budget_year = COALESCE($3, budget_year), budget_amount = COALESCE($4, budget_amount), updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
      [category_id, budget_month, budget_year, budget_amount, req.params.id, req.user.userId]
    );

    const budgetWithCategory = await pool.query(
      'SELECT b.*, c.category_name FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.id = $1',
      [result.rows[0].id]
    );

    res.json(budgetWithCategory.rows[0]);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a budget
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

