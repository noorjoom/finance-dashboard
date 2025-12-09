// Accounts page functionality
let editingAccountId = null;

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

    // Load accounts
    loadAccounts();

    // Form submission
    const form = document.getElementById('accountForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }
});

async function loadAccounts() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';

    try {
        const accounts = await api.getAccounts();
        displayAccounts(accounts);
    } catch (error) {
        console.error('Error loading accounts:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="error-message">Failed to load accounts</td></tr>';
    }
}

function displayAccounts(accounts) {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No accounts yet. Create one to get started!</td></tr>';
        return;
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    tbody.innerHTML = accounts.map(account => {
        const balanceClass = account.balance >= 0 ? 'income' : 'expense';
        return `
            <tr>
                <td>${account.account_name}</td>
                <td>${account.account_type}</td>
                <td class="${balanceClass}">${formatCurrency(account.balance)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editAccount(${account.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAccount(${account.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('accountError');
    if (errorDiv) errorDiv.textContent = '';

    const formData = {
        account_name: document.getElementById('accountName').value,
        account_type: document.getElementById('accountType').value,
        balance: parseFloat(document.getElementById('accountBalance').value) || 0,
    };

    try {
        if (editingAccountId) {
            await api.updateAccount(editingAccountId, formData);
        } else {
            await api.createAccount(formData);
        }
        
        resetForm();
        loadAccounts();
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Failed to save account';
        }
    }
}

function resetForm() {
    const form = document.getElementById('accountForm');
    if (form) form.reset();
    
    document.getElementById('accountBalance').value = '0.00';
    
    editingAccountId = null;
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const formTitle = document.getElementById('formTitle');
    
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (submitBtn) submitBtn.textContent = 'Add Account';
    if (formTitle) formTitle.textContent = 'Add Account';
}

function cancelEdit() {
    resetForm();
}

async function editAccount(id) {
    try {
        const account = await api.getAccount(id);
        editingAccountId = id;

        document.getElementById('accountName').value = account.account_name;
        document.getElementById('accountType').value = account.account_type;
        document.getElementById('accountBalance').value = account.balance;

        const cancelBtn = document.getElementById('cancelBtn');
        const submitBtn = document.getElementById('submitBtn');
        const formTitle = document.getElementById('formTitle');
        
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        if (submitBtn) submitBtn.textContent = 'Update Account';
        if (formTitle) formTitle.textContent = 'Edit Account';

        // Scroll to form
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading account:', error);
        alert('Failed to load account for editing');
    }
}

async function deleteAccount(id) {
    if (!confirm('Are you sure you want to delete this account? This will also delete all associated transactions.')) {
        return;
    }

    try {
        await api.deleteAccount(id);
        loadAccounts();
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account');
    }
}

// Make functions available globally for onclick handlers
window.editAccount = editAccount;
window.deleteAccount = deleteAccount;

