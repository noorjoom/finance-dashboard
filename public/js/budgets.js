// Budgets page functionality
let editingBudgetId = null;
let categories = [];
let budgetChart = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;

    // Set up logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            removeToken();
            window.location.href = '/index.html';
        });
    }

    // Set current month/year
    const now = new Date();
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.value = now.getMonth() + 1;
    }

    // Populate year select and budget year
    if (yearSelect) {
        const currentYear = now.getFullYear();
        for (let i = currentYear; i >= currentYear - 2; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    const budgetYear = document.getElementById('budgetYear');
    if (budgetYear) {
        budgetYear.value = now.getFullYear();
    }

    // Populate month select in form
    const budgetMonth = document.getElementById('budgetMonth');
    if (budgetMonth) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            if (index === now.getMonth()) {
                option.selected = true;
            }
            budgetMonth.appendChild(option);
        });
    }

    // Load data
    loadCategories();
    loadBudgets();

    // Form submission
    const form = document.getElementById('budgetForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }

    // Reload on month/year change
    if (monthSelect) {
        monthSelect.addEventListener('change', loadBudgets);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', loadBudgets);
    }
});

async function loadCategories() {
    try {
        categories = await api.getCategories();
        populateCategorySelect();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategorySelect() {
    const select = document.getElementById('budgetCategory');
    if (!select) return;

    select.innerHTML = '<option value="">Select category</option>';
    
    // Only show expense categories for budgets
    const expenseCategories = categories.filter(cat => cat.category_type === 'Expense');
    expenseCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.category_name;
        select.appendChild(option);
    });
}

async function loadBudgets() {
    const tbody = document.getElementById('budgetsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

    try {
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');
        const month = monthSelect ? monthSelect.value : new Date().getMonth() + 1;
        const year = yearSelect ? yearSelect.value : new Date().getFullYear();

        const budgets = await api.getBudgets({ month, year });
        
        // Get actual spending for each budget
        const budgetsWithActual = await Promise.all(budgets.map(async (budget) => {
            try {
                const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const endDate = new Date(year, month, 0).toISOString().split('T')[0];
                const transactions = await api.getTransactions({
                    start_date: startDate,
                    end_date: endDate,
                    category_id: budget.category_id,
                    transaction_type: 'Expense',
                });
                const actual = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                return { ...budget, actual };
            } catch (error) {
                return { ...budget, actual: 0 };
            }
        }));

        displayBudgets(budgetsWithActual);
        updateBudgetChart(budgetsWithActual);
    } catch (error) {
        console.error('Error loading budgets:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error-message">Failed to load budgets</td></tr>';
    }
}

function displayBudgets(budgets) {
    const tbody = document.getElementById('budgetsTableBody');
    if (!tbody) return;

    if (budgets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No budgets for this period. Create one to get started!</td></tr>';
        return;
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    tbody.innerHTML = budgets.map(budget => {
        const budgeted = parseFloat(budget.budget_amount || 0);
        const actual = parseFloat(budget.actual || 0);
        const remaining = budgeted - actual;
        const remainingClass = remaining >= 0 ? 'income' : 'expense';
        const monthName = months[budget.budget_month - 1];

        return `
            <tr>
                <td>${budget.category_name}</td>
                <td>${monthName}</td>
                <td>${budget.budget_year}</td>
                <td>${formatCurrency(budgeted)}</td>
                <td>${formatCurrency(actual)}</td>
                <td class="${remainingClass}">${formatCurrency(remaining)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editBudget(${budget.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBudget(${budget.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateBudgetChart(budgets) {
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;

    if (!budgets || budgets.length === 0) {
        if (budgetChart) {
            budgetChart.destroy();
        }
        ctx.parentElement.innerHTML = '<p class="empty-state">No budget data for this period</p>';
        return;
    }

    const labels = budgets.map(b => b.category_name);
    const budgetData = budgets.map(b => parseFloat(b.budget_amount || 0));
    const actualData = budgets.map(b => parseFloat(b.actual || 0));

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

async function handleFormSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('budgetError');
    if (errorDiv) errorDiv.textContent = '';

    const formData = {
        category_id: parseInt(document.getElementById('budgetCategory').value),
        budget_month: parseInt(document.getElementById('budgetMonth').value),
        budget_year: parseInt(document.getElementById('budgetYear').value),
        budget_amount: parseFloat(document.getElementById('budgetAmount').value),
    };

    try {
        if (editingBudgetId) {
            await api.updateBudget(editingBudgetId, formData);
        } else {
            await api.createBudget(formData);
        }
        
        resetForm();
        loadBudgets();
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Failed to save budget';
        }
    }
}

function resetForm() {
    const form = document.getElementById('budgetForm');
    if (form) form.reset();
    
    const now = new Date();
    const budgetYear = document.getElementById('budgetYear');
    const budgetMonth = document.getElementById('budgetMonth');
    
    if (budgetYear) budgetYear.value = now.getFullYear();
    if (budgetMonth) budgetMonth.value = now.getMonth() + 1;
    
    editingBudgetId = null;
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const formTitle = document.getElementById('formTitle');
    
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (submitBtn) submitBtn.textContent = 'Add Budget';
    if (formTitle) formTitle.textContent = 'Add Budget';
}

function cancelEdit() {
    resetForm();
}

async function editBudget(id) {
    try {
        const budgets = await api.getBudgets();
        const budget = budgets.find(b => b.id === id);
        
        if (!budget) {
            throw new Error('Budget not found');
        }

        editingBudgetId = id;

        document.getElementById('budgetCategory').value = budget.category_id;
        document.getElementById('budgetMonth').value = budget.budget_month;
        document.getElementById('budgetYear').value = budget.budget_year;
        document.getElementById('budgetAmount').value = budget.budget_amount;

        const cancelBtn = document.getElementById('cancelBtn');
        const submitBtn = document.getElementById('submitBtn');
        const formTitle = document.getElementById('formTitle');
        
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        if (submitBtn) submitBtn.textContent = 'Update Budget';
        if (formTitle) formTitle.textContent = 'Edit Budget';

        // Scroll to form
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading budget:', error);
        alert('Failed to load budget for editing');
    }
}

async function deleteBudget(id) {
    if (!confirm('Are you sure you want to delete this budget?')) {
        return;
    }

    try {
        await api.deleteBudget(id);
        loadBudgets();
    } catch (error) {
        console.error('Error deleting budget:', error);
        alert('Failed to delete budget');
    }
}

// Make functions available globally for onclick handlers
window.editBudget = editBudget;
window.deleteBudget = deleteBudget;

