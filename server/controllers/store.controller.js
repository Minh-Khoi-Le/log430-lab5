/**
 * Store Controller
 * 
 * The controller manages:
 * - Basic CRUD operations for stores
 * - Store inventory management
 */

import StoreDAO from '../dao/store.dao.js';
import StockDAO from '../dao/stock.dao.js';


/**
 * List Stores Controller
 * 
 * Retrieves a list of all stores.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function list(req, res, next) {
  try {
    const stores = await StoreDAO.getAll();
    res.json(stores);
  } catch (err) { next(err); }
}

/**
 * Get Store Controller
 * 
 * Retrieves detailed information about a specific store by ID.
 * 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function get(req, res, next) {
  try {
    const store = await StoreDAO.getById(req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
  } catch (err) { next(err); }
}

/**
 * Create Store Controller
 * 
 * Creates a new store with the provided data.
 * Also initializes stock entries with quantity 0 for all existing products.
 * 
 * @param {Request} req - Express request object with store data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function create(req, res, next) {
  try {
    const store = await StoreDAO.createWithDefaultStock(req.body);
    res.status(201).json(store);
  } catch (err) { next(err); }
}

/**
 * Update Store Controller
 * 
 * Updates an existing store with the provided data.
 *
 * 
 * @param {Request} req - Express request object with store ID parameter and update data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function update(req, res, next) {
  try {
    const store = await StoreDAO.update(req.params.id, req.body);
    res.json(store);
  } catch (err) { next(err); }
}

/**
 * Remove Store Controller
 * 
 * Deletes a store by ID.
 * 
 
 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function remove(req, res, next) {
  try {
    await StoreDAO.delete(req.params.id);
    res.sendStatus(204);
  } catch (err) { next(err); }
}

/**
 * Get Store Stock Controller
 * 
 * Retrieves the current inventory stock for a specific store.
 * 

 * @param {Request} req - Express request object with store ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function stock(req, res, next) {
  try {
    const stocks = await StockDAO.getStockByStore(req.params.storeId);
    res.json(stocks);
  } catch (err) { next(err); }
}