import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("billing"); // "billing" or "personal"
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };

      console.log("Before calling the api");

      const { data } = await axios.post(`${API}/api/users/login`, { email, password }, config);

      console.log("got the data:", data);

      if (loginType === "personal" && data.role !== "Personal Admin") {
        setError("Invalid credentials for Personal Finance.");
        return;
      }
      if (loginType === "billing" && data.role === "Personal Admin") {
        setError("Invalid credentials for GST Billing.");
        return;
      }

      await localStorage.setItem("userInfo", JSON.stringify(data));
      console.log("setting the value", localStorage.getItem("userInfo"));

      if (data.role === "Personal Admin") {
        navigate("/personal/home");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setError(error.response && error.response.data.message ? error.response.data.message : error.message);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: "center", alignItems: "center" }}>
      <div className="glass animate-fade-in" style={{ padding: "2.5rem", width: "100%", maxWidth: "400px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Welcome Back</h2>
        
        {/* Switcher Tab */}
        <div style={{ display: "flex", backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "0.25rem", marginBottom: "1.5rem", gap: "0.25rem" }}>
          <button 
            type="button"
            style={{
              flex: 1,
              background: loginType === "billing" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: loginType === "billing" ? "#818CF8" : "#94A3B8",
              padding: "0.5rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: loginType === "billing" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent"
            }}
            onClick={() => { setLoginType("billing"); setError(""); }}
          >
            GST Billing
          </button>
          <button 
            type="button"
            style={{
              flex: 1,
              background: loginType === "personal" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: loginType === "personal" ? "#818CF8" : "#94A3B8",
              padding: "0.5rem",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: loginType === "personal" ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent"
            }}
            onClick={() => { setLoginType("personal"); setError(""); }}
          >
            Personal Finance
          </button>
        </div>

        {error && <div style={{ color: "var(--danger)", marginBottom: "1rem", textAlign: "center" }}>{error}</div>}
        <form onSubmit={submitHandler}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>
              Email Address
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-muted)" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
