import React, { useState, useEffect } from "react";

function App() {
  const [name, setName] = useState("");
  const [crushes, setCrushes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState("crushes"); // NEW
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [userId, setUserId] = useState(localStorage.getItem("userId") || null);

  // Fetch crushes when logged in
  useEffect(() => {
    if (!token || !userId) return;
    fetch(`http://127.0.0.1:8080/api/crush/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setCrushes)
      .catch(console.error);
  }, [token, userId]);

  // Fetch matches
  const fetchMatches = () => {
    if (!token || !userId) return;
    fetch(`http://127.0.0.1:8080/api/matches/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMatches(data.matches))
      .catch(console.error);
  };

  // Switch tab handler
  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === "matches") fetchMatches();
  };

  // Add crush
  const addCrush = async () => {
    const res = await fetch("http://127.0.0.1:8080/api/crush", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, userId }),
    });
    const data = await res.json();
    setCrushes([...crushes, data]);
    setName("");
  };

  // Signup
  const signup = async () => {
    const res = await fetch("http://127.0.0.1:8080/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Signup successful! Please login.");
      setIsSignup(false);
    } else {
      alert(data.message || "Signup failed");
    }
  };

  // Login - Updated to handle userId
  const login = async () => {
    const res = await fetch("http://127.0.0.1:8080/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      setToken(data.token);
      setUserId(data.userId);
    } else {
      alert(data.message || "Invalid login");
    }
  };

  // Logout
  const logout = async () => {
    await fetch("http://127.0.0.1:8080/api/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setToken(null);
    setUserId(null);
    setCrushes([]);
  };

  // Rest of your component remains the same...
  // If not logged in
  if (!token) {
    return (
      <div>
        <h2>{isSignup ? "Signup" : "Login"}</h2>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {isSignup ? (
          <button onClick={signup}>Signup</button>
        ) : (
          <button onClick={login}>Login</button>
        )}
        <p onClick={() => setIsSignup(!isSignup)} style={{ cursor: "pointer" }}>
          {isSignup ? "Already have an account? Login" : "New user? Signup"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Dating App</h1>
      <button onClick={logout}>Logout</button>

      {/* Tabs */}
      <div style={{ margin: "10px 0" }}>
        <button onClick={() => switchTab("crushes")}>Crushes</button>
        <button onClick={() => switchTab("matches")}>Matches</button>
      </div>

      {activeTab === "crushes" && (
        <div>
          <h2>Crush List</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter crush name"
          />
          <button onClick={addCrush}>Add</button>
          <ul>
            {crushes.map((c, idx) => (
              <li key={idx}>{c.name}</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === "matches" && (
        <div>
          <h2>Matches</h2>
          <ul>
            {matches.length > 0 ? (
              matches.map((m, idx) => <li key={idx}>{m}</li>)
            ) : (
              <p>No matches yet</p>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;