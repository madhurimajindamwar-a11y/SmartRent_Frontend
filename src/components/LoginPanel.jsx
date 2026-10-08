import { useState } from "react";
import { getSession, login, logout } from "../services/auth";
import OwnerDashboard from "./OwnerDashboard";
import AdminDashboard from "./AdminDashboard";
import TenantDashboard from "./TenantDashboard";

const panelStyle = {
maxWidth: "1100px",
margin: "24px auto",
padding: "24px",
background: "white",
border: "1px solid #dbe3ef",
borderRadius: "16px",
};

const formStyle = {
display: "grid",
gap: "16px",
maxWidth: "420px",
marginTop: "20px",
};

const inputStyle = {
width: "100%",
padding: "12px",
border: "1px solid #cbd5e1",
borderRadius: "8px",
marginTop: "6px",
boxSizing: "border-box",
};

const buttonStyle = {
padding: "12px 20px",
background: "#2458ed",
color: "white",
border: "none",
borderRadius: "8px",
cursor: "pointer",
};

export default function LoginPanel() {
const [session, setSession] = useState(() => getSession());
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
    const newSession = await login(email, password);
    setSession(newSession);
    setPassword("");
    } catch (requestError) {
    const status = requestError.response?.status;

    if (status === 401) {
        setError("Incorrect email or password.");
    } else if (status === 400) {
        setError("Please enter a valid email and password.");
    } else if (!requestError.response) {
        setError("Unable to log in. Check that the backend is running.");
    } else {
        setError("Login failed. Please try again.");
    }
    } finally {
    setLoading(false);
    }
}

function handleLogout() {
    logout();
    setSession(null);
    setPassword("");
    setError("");
}

return (
    <section aria-label="SmartRent account" style={panelStyle}>
    {session ? (
        <div>
        <h2>Welcome, {session.user.name}</h2>

        <p>
            Signed in as <strong>{session.user.role}</strong>
        </p>

        <p>{session.user.email}</p>

        <button
            type="button"
            onClick={handleLogout}
            style={buttonStyle}
        >
            Log out
        </button>

        {session.user.role === "OWNER" && (
            <OwnerDashboard key={session.user.id} />
        )}
        {session.user.role === "ADMIN" && (
    <AdminDashboard key={session.user.id} />
)}
        {session.user.role === "TENANT" && (
            <TenantDashboard key={session.user.id} />
        )}
        </div>
    ) : (
        <div>
        <h2>Log in to SmartRent</h2>
        <p>Use your existing tenant, owner, or admin account.</p>

        <form onSubmit={handleLogin} style={formStyle}>
            <label htmlFor="login-email">
            Email
            <input
                id="login-email"
                type="email"
                autoComplete="username"
                maxLength={150}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                style={inputStyle}
            />
            </label>

            <label htmlFor="login-password">
            Password
            <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                style={inputStyle}
            />
            </label>

            {error && (
            <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
                {error}
            </p>
            )}

            <button
            type="submit"
            disabled={loading}
            style={buttonStyle}
            >
            {loading ? "Logging in..." : "Log in"}
            </button>
        </form>
        </div>
    )}
    </section>
);
}