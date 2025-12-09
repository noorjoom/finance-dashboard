// Savings Goals page functionality
let editingGoalId = null;

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

    // Load goals
    loadGoals();

    // Form submission
    const form = document.getElementById('goalForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }
});

async function loadGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;

    container.innerHTML = '<p class="loading">Loading...</p>';

    try {
        const goals = await api.getSavingsGoals();
        displayGoals(goals);
    } catch (error) {
        console.error('Error loading goals:', error);
        container.innerHTML = '<p class="error-message">Failed to load savings goals</p>';
    }
}

function displayGoals(goals) {
    const container = document.getElementById('goalsList');
    if (!container) return;

    if (goals.length === 0) {
        container.innerHTML = '<p class="empty-state">No savings goals yet. Create one to get started!</p>';
        return;
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No target date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    container.innerHTML = goals.map(goal => {
        const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
        const progressPercent = Math.min(100, Math.max(0, progress));
        const isComplete = progressPercent >= 100;

        return `
            <div class="goal-card ${isComplete ? 'complete' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3>${goal.goal_name}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem;">
                            Target: ${formatCurrency(goal.target_amount)} • Due: ${formatDate(goal.target_date)}
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-primary" onclick="editGoal(${goal.id})">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGoal(${goal.id})">Delete</button>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%; background: ${isComplete ? 'var(--success-color)' : 'var(--primary-color)'}"></div>
                </div>
                <p class="progress-text">
                    ${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)} (${progressPercent.toFixed(1)}%)
                    ${isComplete ? '✓ Complete!' : ''}
                </p>
            </div>
        `;
    }).join('');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('goalError');
    if (errorDiv) errorDiv.textContent = '';

    const formData = {
        goal_name: document.getElementById('goalName').value,
        target_amount: parseFloat(document.getElementById('targetAmount').value),
        current_amount: parseFloat(document.getElementById('currentAmount').value) || 0,
        target_date: document.getElementById('targetDate').value || null,
    };

    try {
        if (editingGoalId) {
            await api.updateSavingsGoal(editingGoalId, formData);
        } else {
            await api.createSavingsGoal(formData);
        }
        
        resetForm();
        loadGoals();
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Failed to save savings goal';
        }
    }
}

function resetForm() {
    const form = document.getElementById('goalForm');
    if (form) form.reset();
    
    document.getElementById('currentAmount').value = '0.00';
    
    editingGoalId = null;
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const formTitle = document.getElementById('formTitle');
    
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (submitBtn) submitBtn.textContent = 'Add Goal';
    if (formTitle) formTitle.textContent = 'Add Savings Goal';
}

function cancelEdit() {
    resetForm();
}

async function editGoal(id) {
    try {
        const goals = await api.getSavingsGoals();
        const goal = goals.find(g => g.id === id);
        
        if (!goal) {
            throw new Error('Goal not found');
        }

        editingGoalId = id;

        document.getElementById('goalName').value = goal.goal_name;
        document.getElementById('targetAmount').value = goal.target_amount;
        document.getElementById('currentAmount').value = goal.current_amount;
        document.getElementById('targetDate').value = goal.target_date || '';

        const cancelBtn = document.getElementById('cancelBtn');
        const submitBtn = document.getElementById('submitBtn');
        const formTitle = document.getElementById('formTitle');
        
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        if (submitBtn) submitBtn.textContent = 'Update Goal';
        if (formTitle) formTitle.textContent = 'Edit Savings Goal';

        // Scroll to form
        document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading goal:', error);
        alert('Failed to load goal for editing');
    }
}

async function deleteGoal(id) {
    if (!confirm('Are you sure you want to delete this savings goal?')) {
        return;
    }

    try {
        await api.deleteSavingsGoal(id);
        loadGoals();
    } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete savings goal');
    }
}

// Make functions available globally for onclick handlers
window.editGoal = editGoal;
window.deleteGoal = deleteGoal;

