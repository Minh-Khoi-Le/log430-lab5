/**
 * MaisonMere Routes
 * 
 * Base path: /api/v1/maisonmere
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import ProductDAO from '../dao/product.dao.js';
import StoreDAO from '../dao/store.dao.js';
import * as controller from '../controllers/maisonmere.controller.js';

const prisma = new PrismaClient();
const router = express.Router();


//PRODUCT MANAGEMENT ROUTES
/** 
 * GET /api/v1/maisonmere/products
 * 
 * Get all products in the catalog
 * 
 * Used by:
 * - Parent company product management interfaces
 * - Catalog management dashboards
 */
router.get("/products", async (req, res) => {
  try {
    const products = await ProductDAO.getAll();
    res.json(products);
  } catch (err) {
    console.error("Error retrieving products:", err);
    res
      .status(500)
      .json({ error: "Error retrieving products", details: err.message });
  }
});

/**
 * GET /api/v1/maisonmere/products/:id
 * 
 * Get detailed information about a specific product
 * 
 * Path parameters:
 * - id: Product ID
 * 
 * Used by:
 * - Product detail pages in parent company interfaces
 * - Product editing forms
 */
router.get("/products/:id", async (req, res) => {
  try {
    const product = await ProductDAO.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error retrieving product" });
  }
});

/**
 * POST /api/v1/maisonmere/products
 * 
 * Create a new product in the catalog
 * 
 * Request body:
 * - name: Product name
 * - price: Product price
 * - stock: Initial stock level
 * 
 * Used by:
 * - Admin product list page
 * - New product creation forms
 */
router.post("/products", async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    
    // Create the product first
    const productData = {
      name,
      price: parseFloat(price)
    };
    
    // Use a transaction to create the product and set initial stock levels
    const nouveau = await prisma.$transaction(async (tx) => {
      // Create the product
      const product = await tx.product.create({ data: productData });
      
      // Get all stores
      const stores = await tx.store.findMany();
      
      // Create stock entries for each store
      // Use the provided stock value or default to 0
      const stockValue = stock !== undefined ? parseInt(stock) : 0;
      for (const store of stores) {
        await tx.stock.create({
          data: {
            productId: product.id,
            storeId: store.id,
            quantity: stockValue
          }
        });
      }
      
      // Return the product with stock information
      return tx.product.findUnique({
        where: { id: product.id },
        include: { stocks: true }
      });
    });
    
    res.status(201).json(nouveau);
  } catch (err) {
    res
      .status(400)
      .json({
        error: "Error creating product",
        details: err.message,
      });
  }
});

/**
 * PUT /api/v1/maisonmere/products/:id
 * 
 * Update an existing product in the catalog
 * 
 * Path parameters:
 * - id: Product ID
 * 
 * Request body:
 * - name: Product name (optional)
 * - price: Product price (optional)
 * - stock: Stock level (optional)
 * 
 * Used by:
 * - Admin product list page 
 * - Product editing forms
 */
router.put("/products/:id", async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    const maj = await ProductDAO.update(req.params.id, {
      name,
      price: parseFloat(price),
      stock: parseInt(stock),
    });
    res.json(maj);
  } catch (err) {
    res
      .status(400)
      .json({
        error: "Error modifying product",
        details: err.message,
      });
  }
});

/**
* DELETE /api/v1/maisonmere/products/:id
 * 
 * Remove a product from the catalog
 * 
 * Path parameters:
 * - id: Product ID
 * 
 * Used by:
 * - Admin product list page
 * - Product discontinuation workflows
 */
router.delete("/products/:id", async (req, res) => {
  try {
    await ProductDAO.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: "Product not found", details: err.message });
  }
});

//STORE MANAGEMENT ROUTES (To be implemented)
/**
 * POST /api/v1/maisonmere/stores
 * 
 * Create a new store
 * 
 * Request body:
 * - name: Store name
 * - address: Store address
 * 
 * Used by:
 * - Admin dashboard for store management
 * - Store network expansion workflows
 */
router.post("/stores", async (req, res) => {
  try {
    const { name, address } = req.body;
    const store = await StoreDAO.createWithDefaultStock({ name, address });
    res.status(201).json(store);
  } catch (err) {
    res
      .status(400)
      .json({
        error: "Error creating store",
        details: err.message,
      });
  }
});

/**
 * PUT /api/v1/maisonmere/stores/:id
 * 
 * Update an existing store
 * 
 * Path parameters:
 * - id: Store ID
 * 
 * Request body:
 * - name: Store name (optional)
 * - address: Store address (optional)
 * 
 * Used by:
 * - Admin dashboard for store management
 * - Store information update workflows
 */
router.put("/stores/:id", async (req, res) => {
  try {
    const { name, address } = req.body;
    const store = await StoreDAO.update(req.params.id, { name, address });
    res.json(store);
  } catch (err) {
    res
      .status(400)
      .json({
        error: "Error modifying store",
        details: err.message,
      });
  }
});

/**
 * DELETE /api/v1/maisonmere/stores/:id
 * 
 * Remove a store from the network
 * 
 * Path parameters:
 * - id: Store ID
 * 
 * Used by:
 * - Admin dashboard for store management
 * - Store closure workflows
 */
router.delete("/stores/:id", async (req, res) => {
  try {
    await StoreDAO.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: "Store not found", details: err.message });
  }
});



//REPORTING ROUTES
/**
 * GET /api/v1/maisonmere/stats
 * 
 * Get consolidated statistics for all stores
 * 
 * Query parameters:
 * - excludeRefunded: If 'true', excludes refunded sales from statistics
 * 
 * Used by:
 * - Dashboard page
 * - Management reports
 */
router.get("/stats", controller.getStats);

/**
 * GET /api/v1/maisonmere/refund-stats
 * 
 * Get refund statistics for all stores
 * 
 * Used by:
 * - Dashboard page
 * - Management reports
 */
router.get("/refund-stats", controller.getRefundStats);

/**
 * GET /api/v1/maisonmere/consolidated-sales
 * 
 * Get consolidated sales data within a date range
 * 
 * Query parameters:
 * - startDate: Start date in YYYY-MM-DD format
 * - endDate: End date in YYYY-MM-DD format
 * 
 * Used by:
 * - Sales report generation
 */
router.get("/consolidated-sales", controller.getConsolidatedSales);


export default router;
