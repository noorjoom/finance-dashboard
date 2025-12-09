const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    // Get current user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const updates = {};
    const updateFields = [];

    // Update name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.name = name.trim();
      updateFields.push('name = $' + (updateFields.length + 1));
    }

    // Update email if provided
    if (email !== undefined) {
      if (!email.trim()) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }

      // Check if email is already taken by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.trim(), req.user.userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already taken' });
      }

      updates.email = email.trim();
      updateFields.push('email = $' + (updateFields.length + 1));
    }

    // Update password if provided
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      updates.password_hash = passwordHash;
      updateFields.push('password_hash = $' + (updateFields.length + 1));
    }

    // If no updates provided
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Build and execute update query
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    const values = Object.values(updates);
    values.push(req.user.userId);

    const setClause = updateFields.join(', ');
    const query = `UPDATE users SET ${setClause} WHERE id = $${values.length} RETURNING id, name, email, created_at, updated_at`;

    const result = await pool.query(query, values);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

