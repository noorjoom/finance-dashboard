const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get dashboard summary data
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, year } = req.query;
    
    const currentDate = new Date();
    const currentMonth = month || currentDate.getMonth() + 1;
    const currentYear = year || currentDate.getFullYear();

    // Get account balances
    const accountsResult = await pool.query(
      'SELECT * FROM accounts WHERE user_id = $1',
      [userId]
    );
    const accounts = accountsResult.rows;
    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

    // Get total income and expenses for the month
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    const transactionsResult = await pool.query(
      `SELECT 
        transaction_type,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = $1 
        AND transaction_date >= $2 
        AND transaction_date <= $3
      GROUP BY transaction_type`,
      [userId, startDate, endDate]
    );

    let totalIncome = 0;
    let totalExpenses = 0;
    transactionsResult.rows.forEach(row => {
      if (row.transaction_type === 'Income') {
        totalIncome = parseFloat(row.total || 0);
      } else {
        totalExpenses = parseFloat(row.total || 0);
      }
    });

    // Get recent transactions (last 10)
    const recentTransactionsResult = await pool.query(
      `SELECT t.*, a.account_name, c.category_name 
       FROM transactions t 
       LEFT JOIN accounts a ON t.account_id = a.id 
       LEFT JOIN categories c ON t.category_id = c.id 
       WHERE t.user_id = $1 
       ORDER BY t.transaction_date DESC, t.created_at DESC 
       LIMIT 10`,
      [userId]
    );

    // Get expense breakdown by category for the month
    const expenseBreakdownResult = await pool.query(
      `SELECT 
        c.category_name,
        SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.transaction_type = 'Expense'
        AND t.transaction_date >= $2 
        AND t.transaction_date <= $3
      GROUP BY c.category_name
      ORDER BY total DESC`,
      [userId, startDate, endDate]
    );

    // Get budget vs actual for the month
    const budgetVsActualResult = await pool.query(
      `SELECT 
        b.id,
        c.category_name,
        b.budget_amount,
        COALESCE(SUM(t.amount), 0) as actual_amount
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.transaction_type = 'Expense'
        AND t.transaction_date >= $2 
        AND t.transaction_date <= $3
      WHERE b.user_id = $1 
        AND b.budget_month = $4 
        AND b.budget_year = $5
      GROUP BY b.id, c.category_name, b.budget_amount
      ORDER BY c.category_name`,
      [userId, startDate, endDate, currentMonth, currentYear]
    );

    // Get savings goals
    const savingsGoalsResult = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY target_date NULLS LAST',
      [userId]
    );

    // Calculate net worth (simplified: total balance of all accounts)
    // In a real app, you'd also include investments, property, debts, etc.
    const netWorth = totalBalance;

    res.json({
      summary: {
        totalBalance,
        netWorth,
        totalIncome,
        totalExpenses,
        savings: totalIncome - totalExpenses,
        month: currentMonth,
        year: currentYear,
      },
      accounts,
      recentTransactions: recentTransactionsResult.rows,
      expenseBreakdown: expenseBreakdownResult.rows,
      budgetVsActual: budgetVsActualResult.rows,
      savingsGoals: savingsGoalsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

