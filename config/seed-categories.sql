-- Seed default categories (available to all users)
-- These categories have user_id = NULL, making them available to everyone

-- Income Categories
INSERT INTO categories (user_id, category_name, category_type) VALUES
(NULL, 'Salary', 'Income'),
(NULL, 'Freelance', 'Income'),
(NULL, 'Investment Returns', 'Income'),
(NULL, 'Rental Income', 'Income'),
(NULL, 'Business Income', 'Income'),
(NULL, 'Gift', 'Income'),
(NULL, 'Other Income', 'Income')
ON CONFLICT DO NOTHING;

-- Expense Categories
INSERT INTO categories (user_id, category_name, category_type) VALUES
(NULL, 'Groceries', 'Expense'),
(NULL, 'Dining Out', 'Expense'),
(NULL, 'Rent/Mortgage', 'Expense'),
(NULL, 'Utilities', 'Expense'),
(NULL, 'Transportation', 'Expense'),
(NULL, 'Gas/Fuel', 'Expense'),
(NULL, 'Insurance', 'Expense'),
(NULL, 'Healthcare', 'Expense'),
(NULL, 'Entertainment', 'Expense'),
(NULL, 'Shopping', 'Expense'),
(NULL, 'Clothing', 'Expense'),
(NULL, 'Education', 'Expense'),
(NULL, 'Subscriptions', 'Expense'),
(NULL, 'Phone/Internet', 'Expense'),
(NULL, 'Personal Care', 'Expense'),
(NULL, 'Travel', 'Expense'),
(NULL, 'Gifts/Donations', 'Expense'),
(NULL, 'Home Maintenance', 'Expense'),
(NULL, 'Pet Care', 'Expense'),
(NULL, 'Other Expense', 'Expense')
ON CONFLICT DO NOTHING;

