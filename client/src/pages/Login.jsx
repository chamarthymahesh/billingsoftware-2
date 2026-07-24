import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await localStorage.setItem("userInfo", JSON.stringify(data));
      console.log("setting the value", localStorage.getItem("userInfo"));
      navigate("/dashboard");
    } catch (error) {
      setError(error.response && error.response.data.message ? error.response.data.message : error.message);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: "center", alignItems: "center" }}>
      <div className="glass animate-fade-in" style={{ padding: "2.5rem", width: "100%", maxWidth: "400px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>Welcome Back</h2>
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
