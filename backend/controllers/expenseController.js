const Expense = require('../models/Expense');
const User = require('../models/User');

const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, month, year } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const { count, rows } = await Expense.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      order: [['expense_date', 'DESC']],
      include: [{
        model: User,
        as: 'approvedBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }, {
        model: User,
        as: 'paidBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    res.json({
      success: true,
      expenses: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id, {
      include: [{
        model: User,
        as: 'approvedBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }, {
        model: User,
        as: 'paidBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      expense
    });

  } catch (error) {
    console.error('Get expense by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createExpense = async (req, res) => {
  try {
    const {
      description,
      category,
      amount,
      expense_date,
      recipient,
      notes,
      month,
      year
    } = req.body;

    // Handle file upload
    let attachments = null;
    if (req.file) {
      attachments = [{
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`
      }];
    }

    // Create expense
    const expense = await Expense.create({
      description: description.trim(),
      category,
      amount: parseFloat(amount),
      expense_date: expense_date ? new Date(expense_date) : new Date(),
      recipient: recipient?.trim(),
      notes: notes?.trim(),
      attachments: attachments,
      month: parseInt(month) || new Date().getMonth() + 1,
      year: parseInt(year) || new Date().getFullYear()
    });

    // Fetch with related data
    const expenseWithUsers = await Expense.findByPk(expense.id, {
      include: [{
        model: User,
        as: 'approvedBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }, {
        model: User,
        as: 'paidBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: expenseWithUsers
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      category,
      amount,
      status,
      payment_date,
      payment_method,
      receipt_number,
      approved_by,
      paid_by,
      notes
    } = req.body;

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const updateData = {
      description: description?.trim(),
      category,
      amount: amount ? parseFloat(amount) : expense.amount,
      notes: notes?.trim(),
      payment_method,
      receipt_number: receipt_number?.trim()
    };

    if (status) {
      updateData.status = status;

      if (status === 'approved' && approved_by) {
        updateData.approved_by = approved_by;
        updateData.approval_date = new Date();
      }

      if (status === 'paid' && paid_by) {
        updateData.paid_by = paid_by;
        updateData.payment_date = payment_date ? new Date(payment_date) : new Date();
      }
    }

    await expense.update(updateData);

    // Fetch updated expense with related data
    const updatedExpense = await Expense.findByPk(id, {
      include: [{
        model: User,
        as: 'approvedBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }, {
        model: User,
        as: 'paidBy',
        attributes: ['id', 'role'],
        required: false,
        include: [{
          model: require('../models/MembershipApplication'),
          as: 'membershipApplication',
          attributes: ['name']
        }]
      }]
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Only allow deletion of pending expenses
    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete approved or paid expenses'
      });
    }

    await expense.destroy();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getExpenseStats = async (req, res) => {
  try {
    const { year, month } = req.query;

    const whereClause = {};
    if (year) whereClause.year = year;
    if (month) whereClause.month = month;

    const [totalExpenses, pendingExpenses, approvedExpenses, paidExpenses, totalAmount, monthlyAmount] = await Promise.all([
      Expense.count({ where: whereClause }),
      Expense.count({ where: { ...whereClause, status: 'pending' } }),
      Expense.count({ where: { ...whereClause, status: 'approved' } }),
      Expense.count({ where: { ...whereClause, status: 'paid' } }),
      Expense.sum('amount', { where: { ...whereClause, status: ['approved', 'paid'] } }),
      Expense.sum('amount', {
        where: {
          ...whereClause,
          status: 'paid',
          month: month || new Date().getMonth() + 1,
          year: year || new Date().getFullYear()
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total_expenses: totalExpenses || 0,
        pending_expenses: pendingExpenses || 0,
        approved_expenses: approvedExpenses || 0,
        paid_expenses: paidExpenses || 0,
        total_amount: totalAmount || 0,
        monthly_amount: monthlyAmount || 0
      }
    });

  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats
};
