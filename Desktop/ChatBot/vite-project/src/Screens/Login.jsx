import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Use the VITE_ prefix for environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Changed from hardcoded localhost to API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Required for sending/receiving cookies (JWT)
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("username", data.username);
        navigate("/"); 
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Could not connect to the server. Please check your internet or backend status.");
    }
  };

  return (
    <div className="bg-zinc-900 w-full h-screen text-white flex items-center justify-center overflow-x-hidden">
      {/* Centered the box using flex items-center justify-center instead of large margins */}
      <div className="text-black bg-white p-8 rounded-lg shadow-xl w-full max-w-sm mx-4">
        <h3 className="text-2xl font-bold mb-6 text-center text-zinc-800">Login</h3>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-600 ml-1">Username</label>
            <input
              type="text"
              className="w-full h-11 px-3 border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
              placeholder="Enter your username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-600 ml-1">Password</label>
            <input
              type="password"
              className="w-full h-11 px-3 border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
              placeholder="••••••••"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-md transition-colors shadow-lg shadow-green-500/20 mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;