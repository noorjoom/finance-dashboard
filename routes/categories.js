const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all categories for the authenticated user (and default categories)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1 OR user_id IS NULL ORDER BY user_id NULLS LAST, category_name',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific category
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new category
router.post('/', async (req, res) => {
  try {
    const { category_name, category_type } = req.body;

    if (!category_name || !category_type) {
      return res.status(400).json({ error: 'Category name and type are required' });
    }

    if (!['Income', 'Expense'].includes(category_type)) {
      return res.status(400).json({ error: 'Category type must be either Income or Expense' });
    }

    const result = await pool.query(
      'INSERT INTO categories (user_id, category_name, category_type) VALUES ($1, $2, $3) RETURNING *',
      [req.user.userId, category_name, category_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a category
router.put('/:id', async (req, res) => {
  try {
    const { category_name, category_type } = req.body;

    // First check if category exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category_type && !['Income', 'Expense'].includes(category_type)) {
      return res.status(400).json({ error: 'Category type must be either Income or Expense' });
    }

    const result = await pool.query(
      'UPDATE categories SET category_name = COALESCE($1, category_name), category_type = COALESCE($2, category_type), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
      [category_name, category_type, req.params.id, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a category
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

