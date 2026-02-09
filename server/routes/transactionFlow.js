const express = require('express');
const TransactionFlow = require('../models/TransactionFlow');
const router = express.Router();

// Get all transaction flows (public endpoint)
router.get('/public', async (req, res) => {
    try {
        const transactionFlows = await TransactionFlow.find({ isActive: true })
            .select('name description prefix steps isActive')
            .sort({ name: 1 });
        
        res.json({
            success: true,
            data: transactionFlows,
            count: transactionFlows.length
        });
    } catch (error) {
        console.error('Error fetching public transaction flows:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction flows',
            error: error.message
        });
    }
});

// Get all transaction flows (admin endpoint)
router.get('/', async (req, res) => {
    try {
        const transactionFlows = await TransactionFlow.find().sort({ name: 1 });
        res.json({
            success: true,
            data: transactionFlows,
            count: transactionFlows.length
        });
    } catch (error) {
        console.error('Error fetching transaction flows:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction flows',
            error: error.message
        });
    }
});

// Get transaction flow by ID
router.get('/:id', async (req, res) => {
    try {
        const transactionFlow = await TransactionFlow.findById(req.params.id);
        if (!transactionFlow) {
            return res.status(404).json({
                success: false,
                message: 'Transaction flow not found'
            });
        }
        res.json({
            success: true,
            data: transactionFlow
        });
    } catch (error) {
        console.error('Error fetching transaction flow:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction flow',
            error: error.message
        });
    }
});

// Create new transaction flow
router.post('/', async (req, res) => {
    try {
        const flowData = req.body;
        const transactionFlow = new TransactionFlow(flowData);
        await transactionFlow.save();
        
        res.status(201).json({
            success: true,
            message: 'Transaction flow created successfully',
            data: transactionFlow
        });
    } catch (error) {
        console.error('Error creating transaction flow:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create transaction flow',
            error: error.message
        });
    }
});

// Update transaction flow
router.put('/:id', async (req, res) => {
    try {
        const transactionFlow = await TransactionFlow.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!transactionFlow) {
            return res.status(404).json({
                success: false,
                message: 'Transaction flow not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Transaction flow updated successfully',
            data: transactionFlow
        });
    } catch (error) {
        console.error('Error updating transaction flow:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update transaction flow',
            error: error.message
        });
    }
});

// Delete transaction flow
router.delete('/:id', async (req, res) => {
    try {
        const transactionFlow = await TransactionFlow.findByIdAndDelete(req.params.id);
        
        if (!transactionFlow) {
            return res.status(404).json({
                success: false,
                message: 'Transaction flow not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Transaction flow deleted successfully',
            data: transactionFlow
        });
    } catch (error) {
        console.error('Error deleting transaction flow:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete transaction flow',
            error: error.message
        });
    }
});

module.exports = router;
