/**
 * Local Cart Hook
 * 
 * Simple local state management for shopping cart functionality
 * Replaces the cart service with localStorage-backed React state
 */

import { useState, useEffect } from "react";

const CART_STORAGE_KEY = "shopping_cart";

export function useLocalCart() {
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cart]);

  /**
   * Add a product to the cart
   * @param {Object} product - Product to add to cart 
   */
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  /**
   * Remove a product from the cart (decrease quantity by 1)
   * @param {number} productId - ID of the product to remove
   */
  const removeFromCart = (productId) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  /**
   * Clear the entire cart
   */
  const clearCart = () => {
    setCart([]);
  };

  /**
   * Get the total number of items in cart
   */
  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  /**
   * Get the total price of all items in cart
   */
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    getCartItemCount,
    getCartTotal,
    setCart
  };
}
