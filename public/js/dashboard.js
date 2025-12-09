// Dashboard functionality
let expenseChart = null;
let budgetChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!requireAuth()) return;

    // Set up logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            removeToken();
            window.location.href = '/index.html';
        });
    }

    // Set current month/year in selects
    const now = new Date();
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.value = now.getMonth() + 1;
    }

    // Populate year select (current year and 2 years back)
    if (yearSelect) {
        for (let i = now.getFullYear(); i >= now.getFullYear() - 2; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === now.getFullYear()) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    // Load dashboard data
    loadDashboardData();

    // Reload on month/year change
    if (monthSelect) {
        monthSelect.addEventListener('change', loadDashboardData);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', loadDashboardData);
    }
});

async function loadDashboardData() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const month = monthSelect ? monthSelect.value : new Date().getMonth() + 1;
    const year = yearSelect ? yearSelect.value : new Date().getFullYear();

    try {
        const data = await api.getDashboardData({ month, year });
        updateSummaryCards(data.summary);
        updateRecentTransactions(data.recentTransactions);
        updateSavingsGoals(data.savingsGoals);
        updateExpenseChart(data.expenseBreakdown);
        updateBudgetChart(data.budgetVsActual);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

function updateSummaryCards(summary) {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const totalBalanceEl = document.getElementById('totalBalance');
    const netWorthEl = document.getElementById('netWorth');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const savingsEl = document.getElementById('savings');

    if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(summary.totalBalance);
    if (netWorthEl) netWorthEl.textContent = formatCurrency(summary.netWorth);
    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(summary.totalIncome);
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(summary.totalExpenses);
    if (savingsEl) savingsEl.textContent = formatCurrency(summary.savings);
}

function updateRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="empty-state">No recent transactions</p>';
        return;
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    container.innerHTML = transactions.map(transaction => {
        const typeClass = transaction.transaction_type.toLowerCase();
        const amountClass = transaction.transaction_type === 'Income' ? 'income' : 'expense';
        const sign = transaction.transaction_type === 'Income' ? '+' : '-';

        return `
            <div class="transaction-item ${typeClass}">
                <div class="transaction-info">
                    <h4>${transaction.description || 'No description'}</h4>
                    <p>${transaction.account_name || 'Unknown Account'} • ${transaction.category_name || 'Uncategorized'} • ${formatDate(transaction.transaction_date)}</p>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${sign}${formatCurrency(Math.abs(transaction.amount))}
                </div>
            </div>
        `;
    }).join('');
}

function updateSavingsGoals(goals) {
    const container = document.getElementById('savingsGoals');
    if (!container) return;

    if (!goals || goals.length === 0) {
        container.innerHTML = '<p class="empty-state">No savings goals yet. Create one to get started!</p>';
        return;
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No target date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    container.innerHTML = goals.map(goal => {
        const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
        const progressPercent = Math.min(100, Math.max(0, progress));

        return `
            <div class="goal-card">
                <h3>${goal.goal_name}</h3>
                <p>Target: ${formatCurrency(goal.target_amount)} • Due: ${formatDate(goal.target_date)}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <p class="progress-text">${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)} (${progressPercent.toFixed(1)}%)</p>
            </div>
        `;
    }).join('');
}

function updateExpenseChart(expenseBreakdown) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;

    if (!expenseBreakdown || expenseBreakdown.length === 0) {
        if (expenseChart) {
            expenseChart.destroy();
        }
        ctx.parentElement.innerHTML = '<p class="empty-state">No expense data for this period</p>';
        return;
    }

    const labels = expenseBreakdown.map(item => item.category_name);
    const data = expenseBreakdown.map(item => parseFloat(item.total));

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#2563eb',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#ec4899',
                    '#06b6d4',
                    '#84cc16',
                ],
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        },
    });
}

function updateBudgetChart(budgetVsActual) {
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;

    if (!budgetVsActual || budgetVsActual.length === 0) {
        if (budgetChart) {
            budgetChart.destroy();
        }
        ctx.parentElement.innerHTML = '<p class="empty-state">No budget data for this period</p>';
        return;
    }

    const labels = budgetVsActual.map(item => item.category_name);
    const budgetData = budgetVsActual.map(item => parseFloat(item.budget_amount));
    const actualData = budgetVsActual.map(item => parseFloat(item.actual_amount));

    if (budgetChart) {
        budgetChart.destroy();
    }

    budgetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Budgeted',
                    data: budgetData,
                    backgroundColor: '#2563eb',
                },
                {
                    label: 'Actual',
                    data: actualData,
                    backgroundColor: '#10b981',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
            plugins: {
                legend: {
                    position: 'top',
                },
            },
        },
    });
}

function showError(message) {
    // Simple error display - can be enhanced
    alert(message);
}

