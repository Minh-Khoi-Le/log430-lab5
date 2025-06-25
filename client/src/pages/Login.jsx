/**
 * Login Page
 * 
 * This component handles user authentication.
 * After successful login, it updates the user context with the user information.
 * The role is determined by the user's account information from the backend.
 */

import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";

function Login() {
  // State for form fields
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();

  // Fetch the list of stores when component mounts
  useEffect(() => {
    fetch("http://localhost:3000/api/v1/stores")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Stores data received:', data); // Debug log
        if (Array.isArray(data)) {
          setStores(data);
        } else {
          console.error('Stores data is not an array:', data);
          setStores([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching stores:', error);
        setStores([]);
      });
  }, []);

  /**
   * Handle form submission
   * 
   * Authenticates the user against the backend API and
   * sets up the user context upon successful login
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Validate form fields
    if (!name.trim()) {
      setError("Please enter your name!");
      setLoading(false);
      return;
    }
    
    // Send login request to API
    fetch("http://localhost:3000/api/v1/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        password: password.trim() || "password",
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Login failed");
        }
        
        // Get the token from headers
        const token = res.headers.get('Authorization')?.split(' ')[1];
        if (!token) {
          throw new Error("No authentication token received");
        }
        
        return res.json().then(userData => ({ userData, token }));
      })
      .then(({ userData, token }) => {
        // For client role, ensure a store is selected
        if (userData.role === "client" && !storeId) {
          setError("As a client, please choose a store!");
          setLoading(false);
          return;
        }
        
        // Create user object and update context
        setUser({
          id: userData.id,
          role: userData.role,
          name: userData.name,
          token: token,
          storeId: userData.role === "client" ? parseInt(storeId) : null,
          storeName:
            userData.role === "client"
              ? stores.find((m) => m.id === parseInt(storeId))?.name || ""
              : "",
        });
      })
      .catch((err) => {
        console.error(err);
        setError("Authentication failed. Please check your credentials.");
        setLoading(false);
      });
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      padding: "1rem",
      backgroundColor: "#f9f9f9"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        padding: "2rem",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Login</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Username field */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Username:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>
          
          {/* Password field */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>
          
          {/* Store selection field */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              Store (for clients):
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "white"
              }}
            >
              <option value="">-- Select a store --</option>
              {Array.isArray(stores) && stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <p style={{ 
              margin: "0.25rem 0 0 0", 
              fontSize: "0.8rem", 
              color: "#666" 
            }}>
              * If you are a manager, you can ignore this selection
            </p>
          </div>
          
          {/* Error message */}
          {error && (
            <div style={{ 
              padding: "0.5rem",
              backgroundColor: "#ffe6e6",
              color: "#cc0000",
              borderRadius: "4px",
              marginBottom: "1rem",
              fontSize: "0.9rem"
            }}>
              {error}
            </div>
          )}
          
          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "#4568dc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
      
      {/* Test credentials information box */}
      <div style={{ 
        width: "100%",
        maxWidth: "400px",
        marginTop: "2rem",
        padding: "1rem",
        backgroundColor: "#f0f4ff",
        border: "1px solid #d0d8ff",
        borderRadius: "6px"
      }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", textAlign: "center" }}>
          Test Accounts
        </h3>
        
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ width: "48%" }}>
            <p style={{ fontWeight: "bold", margin: "0.5rem 0", fontSize: "0.9rem" }}>
              Client:
            </p>
            <ul style={{ margin: "0", paddingLeft: "1.5rem", fontSize: "0.9rem" }}>
              <li>Name: <strong>c</strong></li>
              <li>Password: <strong>c</strong></li>
              <li>Choose a store</li>
            </ul>
          </div>
          
          <div style={{ width: "48%" }}>
            <p style={{ fontWeight: "bold", margin: "0.5rem 0", fontSize: "0.9rem" }}>
              Manager:
            </p>
            <ul style={{ margin: "0", paddingLeft: "1.5rem", fontSize: "0.9rem" }}>
              <li>Name: <strong>g</strong></li>
              <li>Password: <strong>g</strong></li>
              <li>No store needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
