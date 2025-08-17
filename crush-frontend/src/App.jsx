import React, { useState, useEffect } from "react";

// Environment configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function App() {
  const [name, setName] = useState("");
  const [crushes, setCrushes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState("crushes");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [userId, setUserId] = useState(localStorage.getItem("userId") || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Enhanced fetch with error handling
  const fetchWithErrorHandling = async (url, options = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Request failed');
      }

      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message || 'Something went wrong');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch crushes when logged in
  useEffect(() => {
    if (!token || !userId) return;
    
    const fetchCrushes = async () => {
      try {
        const data = await fetchWithErrorHandling(
          `${API_BASE_URL}/api/crush/${userId}`
        );
        setCrushes(data);
      } catch (err) {
        // Error already handled by fetchWithErrorHandling
      }
    };

    fetchCrushes();
  }, [token, userId]);

  // Fetch matches
  const fetchMatches = async () => {
    try {
      const data = await fetchWithErrorHandling(
        `${API_BASE_URL}/api/matches/${userId}`
      );
      setMatches(data.matches || []);
    } catch (err) {
      // Error already handled by fetchWithErrorHandling
    }
  };

  // Switch tab handler
  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === "matches") fetchMatches();
  };

  // Add crush
  const addCrush = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      const data = await fetchWithErrorHandling(`${API_BASE_URL}/api/crush`, {
        method: "POST",
        body: JSON.stringify({ name, userId }),
      });
      setCrushes([...crushes, data]);
      setName("");
    } catch (err) {
      // Error already handled by fetchWithErrorHandling
    }
  };

  // Auth functions
  const handleAuth = async (isLogin) => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    try {
      const endpoint = isLogin ? 'login' : 'register';
      const data = await fetchWithErrorHandling(`${API_BASE_URL}/api/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        setToken(data.token);
        setUserId(data.userId);
      }
    } catch (err) {
      // Error already handled by fetchWithErrorHandling
    }
  };

  // Logout
  const logout = () => {
    // Clear client-side first for immediate feedback
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setToken(null);
    setUserId(null);
    setCrushes([]);
    setMatches([]);
    
    // Then attempt server logout (fire and forget)
    fetch(`${API_BASE_URL}/api/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  // If not logged in
  if (!token) {
    return (
      <div className="auth-container">
        <h2>{isSignup ? "Sign Up" : "Log In"}</h2>
        {error && <div className="error-message">{error}</div>}
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        {isSignup ? (
          <button onClick={() => handleAuth(false)} disabled={isLoading}>
            {isLoading ? "Signing Up..." : "Sign Up"}
          </button>
        ) : (
          <button onClick={() => handleAuth(true)} disabled={isLoading}>
            {isLoading ? "Logging In..." : "Log In"}
          </button>
        )}
        <p 
          onClick={() => {
            setIsSignup(!isSignup);
            setError(null);
          }} 
          className="auth-toggle"
        >
          {isSignup ? "Already have an account? Log In" : "New user? Sign Up"}
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>Dating App</h1>
        <button onClick={logout} disabled={isLoading}>
          {isLoading ? "Logging Out..." : "Logout"}
        </button>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button 
          onClick={() => switchTab("crushes")} 
          disabled={activeTab === "crushes" || isLoading}
        >
          Crushes
        </button>
        <button 
          onClick={() => switchTab("matches")} 
          disabled={activeTab === "matches" || isLoading}
        >
          Matches
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === "crushes" && (
        <div className="crush-section">
          <h2>Crush List</h2>
          <div className="crush-input">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter crush name"
              disabled={isLoading}
              onKeyPress={(e) => e.key === 'Enter' && addCrush()}
            />
            <button onClick={addCrush} disabled={isLoading || !name.trim()}>
              {isLoading ? "Adding..." : "Add"}
            </button>
          </div>
          <ul>
            {crushes.length > 0 ? (
              crushes.map((c, idx) => <li key={idx}>{c.name}</li>)
            ) : (
              <p>No crushes yet</p>
            )}
          </ul>
        </div>
      )}

      {activeTab === "matches" && (
        <div className="matches-section">
          <h2>Matches</h2>
          {isLoading ? (
            <p>Loading matches...</p>
          ) : (
            <ul>
              {matches.length > 0 ? (
                matches.map((m, idx) => <li key={idx}>{m}</li>)
              ) : (
                <p>No matches yet</p>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;