// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Set token in localStorage
function setToken(token) {
    localStorage.setItem('token', token);
}

// Remove token from localStorage
function removeToken() {
    localStorage.removeItem('token');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getToken();
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// API request wrapper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
        },
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - clear token and redirect to login
                removeToken();
                window.location.href = '/index.html';
            }
            throw new Error(data.error || 'An error occurred');
        }

        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// API Methods
const api = {
    // Authentication
    async register(userData) {
        return apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },

    async login(credentials) {
        return apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    // Accounts
    async getAccounts() {
        return apiRequest('/accounts');
    },

    async getAccount(id) {
        return apiRequest(`/accounts/${id}`);
    },

    async createAccount(accountData) {
        return apiRequest('/accounts', {
            method: 'POST',
            body: JSON.stringify(accountData),
        });
    },

    async updateAccount(id, accountData) {
        return apiRequest(`/accounts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(accountData),
        });
    },

    async deleteAccount(id) {
        return apiRequest(`/accounts/${id}`, {
            method: 'DELETE',
        });
    },

    // Categories
    async getCategories() {
        return apiRequest('/categories');
    },

    async createCategory(categoryData) {
        return apiRequest('/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData),
        });
    },

    async updateCategory(id, categoryData) {
        return apiRequest(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData),
        });
    },

    async deleteCategory(id) {
        return apiRequest(`/categories/${id}`, {
            method: 'DELETE',
        });
    },

    // Transactions
    async getTransactions(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/transactions?${queryParams}` : '/transactions';
        return apiRequest(endpoint);
    },

    async getRecurringTransactions() {
        return apiRequest('/transactions/recurring');
    },

    async getTransaction(id) {
        return apiRequest(`/transactions/${id}`);
    },

    async createTransaction(transactionData) {
        return apiRequest('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData),
        });
    },

    async updateTransaction(id, transactionData) {
        return apiRequest(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(transactionData),
        });
    },

    async deleteTransaction(id) {
        return apiRequest(`/transactions/${id}`, {
            method: 'DELETE',
        });
    },

    // Budgets
    async getBudgets(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/budgets?${queryParams}` : '/budgets';
        return apiRequest(endpoint);
    },

    async createBudget(budgetData) {
        return apiRequest('/budgets', {
            method: 'POST',
            body: JSON.stringify(budgetData),
        });
    },

    async updateBudget(id, budgetData) {
        return apiRequest(`/budgets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(budgetData),
        });
    },

    async deleteBudget(id) {
        return apiRequest(`/budgets/${id}`, {
            method: 'DELETE',
        });
    },

    // Savings Goals
    async getSavingsGoals() {
        return apiRequest('/savings-goals');
    },

    async createSavingsGoal(goalData) {
        return apiRequest('/savings-goals', {
            method: 'POST',
            body: JSON.stringify(goalData),
        });
    },

    async updateSavingsGoal(id, goalData) {
        return apiRequest(`/savings-goals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(goalData),
        });
    },

    async deleteSavingsGoal(id) {
        return apiRequest(`/savings-goals/${id}`, {
            method: 'DELETE',
        });
    },

    // Dashboard
    async getDashboardData(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/dashboard?${queryParams}` : '/dashboard';
        return apiRequest(endpoint);
    },
};

