/**
 * Stock Controller
 * 
 * Handles stock-related operations including:
 * - Retrieving stock information by store or product
 * - Updating stock quantities
 */

import { ApiError } from '../middleware/errorHandler.js';
import stockDAO from '../dao/stock.dao.js';

/**
 * Get Stock by Product
 * 
 * Retrieves all stock information for a specific product across all stores.
 * 
 * @param {Request} req - Express request object with product ID in params
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getByProduct(req, res, next) {
  try {
    const productId = req.params.productId;
    const stocks = await stockDAO.getStockByProduct(productId);
    res.json(stocks);
  } catch (error) {
    next(error);
  }
}

/**
 * Get Stock by Store
 * 
 * Retrieves all stock information for a specific store.
 * 
 * @param {Request} req - Express request object with store ID in params
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function getByStore(req, res, next) {
  try {
    const storeId = req.params.storeId;
    const stocks = await stockDAO.getStockByStore(storeId);
    res.json(stocks);
  } catch (error) {
    next(error);
  }
}

/**
 * Update Stock
 * 
 * Updates the stock quantity for a specific product in a specific store.
 * 
 * @param {Request} req - Express request object with product ID in params and stock data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function updateStock(req, res, next) {
  try {
    const { productId } = req.params;
    const { storeId, quantity } = req.body;
    
    if (!storeId || quantity === undefined) {
      throw new ApiError(400, 'Store ID and quantity are required');
    }
    
    const stock = await stockDAO.updateStock(productId, storeId, quantity);
    res.json(stock);
  } catch (error) {
    next(error);
  }
} 