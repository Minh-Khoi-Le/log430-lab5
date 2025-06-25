import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Dashboard from "./pages/Dashboard";
import CartPage from "./pages/CartPage";
import History from "./pages/History";
import StoreDetail from "./pages/StoreDetail";
import Navbar from "./components/Navbar";
import { UserProvider, useUser } from "./context/UserContext";
import { CartProvider } from "./context/CartContext";

/**
 * MainApp Component
 * 
 * Handles the main application logic including:
 * - Authentication state management
 * - Conditional routing based on user role
 * - Shopping cart state management
 * 
 * If no user is authenticated, it displays the login page.
 * Otherwise, it shows the appropriate routes based on user role.
 */
function MainApp() {
  const { user } = useUser();

  // If no user is authenticated, show login page
  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Product catalog - accessible to all users */}
        <Route path="/" element={<Products />} />
        
        {/* Routes for gestionnaire (manager) role */}
        {user.role === "gestionnaire" && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/store/:storeId" element={<StoreDetail />} />
          </>
        )}
        
        {/* Shopping cart - only accessible to users with client role */}
        {user.role === "client" && (
          <>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/history" element={<History />} />
          </>
        )}
        
        {/* Redirect all other routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <UserProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </UserProvider>
  );
}
