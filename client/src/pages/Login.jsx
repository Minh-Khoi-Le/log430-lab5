/**
 * Login Page
 * 
 * This component handles user authentication.
 * After successful login, it updates the user context with the user information.
 * The role is determined by the user's account information from the backend.
 */

import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { apiFetch, API_ENDPOINTS, API_BASE } from "../api";

function Login() {
  // State for form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();

  // Fetch the list of stores when component mounts
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await apiFetch(API_ENDPOINTS.STORES.BASE);
        console.log('Stores response received:', response); // Debug log
        console.log('Full API URL called:', `${API_BASE}${API_ENDPOINTS.STORES.BASE}`); // Debug: show full URL
        console.log('API_BASE:', API_BASE);
        console.log('STORES.BASE:', API_ENDPOINTS.STORES.BASE);
        
        // Handle the API response structure: { success: true, data: { stores: [...], total: 3 } }
        if (response.success && response.data) {
          if (Array.isArray(response.data.stores)) {
            setStores(response.data.stores);
          } else if (Array.isArray(response.data)) {
            // Fallback: if data is directly an array
            setStores(response.data);
          } else {
            console.error('Stores data is not in expected format:', response.data);
            setStores([]);
          }
        } else {
          console.error('API response does not have expected success/data structure:', response);
          setStores([]);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
        setStores([]);
      }
    };

    fetchStores();
  }, []);

  /**
   * Handle form submission
   * 
   * Authenticates the user against the backend API and
   * sets up the user context upon successful login
   * 
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Validate form fields
    if (!username.trim()) {
      setError("Please enter your username!");
      setLoading(false);
      return;
    }
    
    try {
      // Send login request to API Gateway
      const response = await apiFetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({
          email: username.trim(), // Send username as email since backend expects email field
          password: password.trim(),
        }),
      });

      // Extract token and user data from response
      const { data } = response;
      
      if (!data || !data.tokens || !data.tokens.access) {
        throw new Error("No authentication token received");
      }
      
      const userData = data.user;
      const token = data.tokens.access;
      
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
        name: userData.firstName || userData.name || username,
        email: userData.email || username,
        token: token,
        storeId: userData.role === "client" ? parseInt(storeId) : null,
        storeName:
          userData.role === "client"
            ? stores.find((m) => m.id === parseInt(storeId))?.name || ""
            : "",
      });
    } catch (err) {
      console.error(err);
      setError("Authentication failed. Please check your credentials.");
      setLoading(false);
    }
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.8rem" }}>
              <li>Username: c</li>
              <li>Password: c</li>
            </ul>
          </div>
          
          <div style={{ width: "48%" }}>
            <p style={{ fontWeight: "bold", margin: "0.5rem 0", fontSize: "0.9rem" }}>
              Admin:
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.8rem" }}>
              <li>Username: a</li>
              <li>Password: a</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
