// Transactions page functionality
let editingTransactionId = null;
let accounts = [];
let categories = [];

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

    // Set default date to today
    const dateInput = document.getElementById('transactionDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Load initial data
    loadAccounts();
    loadCategories();
    loadTransactions();

    // Form submission
    const form = document.getElementById('transactionForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Cancel edit
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }

    // Filters
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', loadTransactions);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
});

async function loadAccounts() {
    try {
        accounts = await api.getAccounts();
        populateAccountSelects();
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

async function loadCategories() {
    try {
        categories = await api.getCategories();
        populateCategorySelects();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateAccountSelects() {
    const selects = ['transactionAccount', 'filterAccount'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const isFilter = selectId === 'filterAccount';
        if (isFilter) {
            select.innerHTML = '<option value="">All</option>';
        } else {
            select.innerHTML = '<option value="">Select account</option>';
        }

        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.account_name} (${account.account_type})`;
            select.appendChild(option);
        });
    });
}

function populateCategorySelects() {
    const selects = ['transactionCategory', 'filterCategory'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const isFilter = selectId === 'filterCategory';
        if (isFilter) {
            select.innerHTML = '<option value="">All</option>';
        } else {
            select.innerHTML = '<option value="">Select category (optional)</option>';
        }

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.category_name;
            select.appendChild(option);
        });
    });
}

async function loadTransactions() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading...</td></tr>';

    try {
        const filters = getFilters();
        const transactions = await api.getTransactions(filters);
        displayTransactions(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error-message">Failed to load transactions</td></tr>';
    }
}

function getFilters() {
    const filters = {};
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    const type = document.getElementById('filterType')?.value;
    const account = document.getElementById('filterAccount')?.value;
    const category = document.getElementById('filterCategory')?.value;

    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    if (type) filters.transaction_type = type;
    if (account) filters.account_id = account;
    if (category) filters.category_id = category;

    return filters;
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No transactions found</td></tr>';
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

    tbody.innerHTML = transactions.map(transaction => {
        const typeClass = transaction.transaction_type === 'Income' ? 'income' : 'expense';
        const sign = transaction.transaction_type === 'Income' ? '+' : '-';

        return `
            <tr>
                <td>${formatDate(transaction.transaction_date)}</td>
                <td>${transaction.description || '-'}</td>
                <td>${transaction.account_name || '-'}</td>
                <td>${transaction.category_name || 'Uncategorized'}</td>
                <td><span class="${typeClass}">${transaction.transaction_type}</span></td>
                <td class="${typeClass}">${sign}${formatCurrency(Math.abs(transaction.amount))}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editTransaction(${transaction.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransaction(${transaction.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('transactionError');
    if (errorDiv) errorDiv.textContent = '';

    const formData = {
        account_id: parseInt(document.getElementById('transactionAccount').value),
        category_id: document.getElementById('transactionCategory').value ? parseInt(document.getElementById('transactionCategory').value) : null,
        transaction_date: document.getElementById('transactionDate').value,
        description: document.getElementById('transactionDescription').value,
        amount: parseFloat(document.getElementById('transactionAmount').value),
        transaction_type: document.getElementById('transactionType').value,
        is_recurring: document.getElementById('transactionRecurring').checked,
    };

    try {
        if (editingTransactionId) {
            await api.updateTransaction(editingTransactionId, formData);
        } else {
            await api.createTransaction(formData);
        }
        
        resetForm();
        loadTransactions();
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Failed to save transaction';
        }
    }
}

function resetForm() {
    const form = document.getElementById('transactionForm');
    if (form) form.reset();
    
    const dateInput = document.getElementById('transactionDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    editingTransactionId = null;
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function cancelEdit() {
    resetForm();
}

async function editTransaction(id) {
    try {
        const transaction = await api.getTransaction(id);
        editingTransactionId = id;

        document.getElementById('transactionType').value = transaction.transaction_type;
        document.getElementById('transactionAccount').value = transaction.account_id;
        document.getElementById('transactionCategory').value = transaction.category_id || '';
        document.getElementById('transactionDate').value = transaction.transaction_date;
        document.getElementById('transactionDescription').value = transaction.description || '';
        document.getElementById('transactionAmount').value = transaction.amount;
        document.getElementById('transactionRecurring').checked = transaction.is_recurring;

        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        // Scroll to form
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading transaction:', error);
        alert('Failed to load transaction for editing');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

    try {
        await api.deleteTransaction(id);
        loadTransactions();
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction');
    }
}

function clearFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterAccount').value = '';
    document.getElementById('filterCategory').value = '';
    loadTransactions();
}

// Make functions available globally for onclick handlers
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;

