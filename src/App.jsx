import { useEffect, useState } from "react";
import PropertyDetails from "./pages/PropertyDetails";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { getSession, login, logout } from "./services/auth";
import api from "./services/api";

import BrowseRooms from "./pages/BrowseRooms";
import Register from "./pages/Register";
import OwnerDashboard from "./components/OwnerDashboard";
import TenantDashboard from "./components/TenantDashboard";
import AdminDashboard from "./components/AdminDashboard";

import "./App.css";

function SignIn({ onSignedIn, expired }) {
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const newSession = await login(email, password);
      onSignedIn(newSession);
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 401) {
        setError("The email or password is incorrect.");
      } else if (status === 400) {
        setError("Check your email and password.");
      } else {
        setError("We couldn’t sign you in. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">WELCOME TO SMARTRENT</p>

        <h1>
          A simpler way
          <br />
          to find your place.
        </h1>

        <p>
          Keep your saved rooms, rental requests, and updates together.
        </p>

        <Link to="/">← Back to available rooms</Link>
      </div>

      <div className="auth-card">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h2>Welcome back</h2>
        <p>Sign in with your registered email address.</p>

        {location.state?.registered && (
          <p className="success-message" role="status">
            Your account is ready. Sign in to get started.
          </p>
        )}

        {expired && (
          <p role="status">
            Your session ended. Please sign in again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="stack-form">
          <label htmlFor="signin-email">
            Email address
            <input
              id="signin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={150}
              required
              disabled={busy}
            />
          </label>

          <label htmlFor="signin-password">
            Password
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={busy}
            />
          </label>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New to SmartRent?{" "}
          <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [expired, setExpired] = useState(false);

  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!session) return;

    function endSession() {
      logout();
      setSession(null);
      setExpired(true);
    }

    const timer = window.setTimeout(
      endSession,
      Math.max(0, session.expiresAt - Date.now())
    );

    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          error.config?.url !== "/auth/login"
        ) {
          endSession();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      window.clearTimeout(timer);
      api.interceptors.response.eject(interceptor);
    };
  }, [session]);

  function handleSignOut() {
    logout();
    setSession(null);
    setExpired(false);
  }

  function handleSignedIn(newSession) {
    setSession(newSession);
    setExpired(false);
  }

  const role = session?.user.role;

  const roleLabel =
    role === "OWNER"
      ? "Owner"
      : role === "ADMIN"
        ? "Admin"
        : "Tenant";

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="SmartRent home">
            <span className="brand-mark" aria-hidden="true">
              S
            </span>
            Smart<span>Rent</span>
          </Link>

          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/" end>
              Find a room
            </NavLink>

            {session ? (
              <>
                <NavLink to="/dashboard">My dashboard</NavLink>

                <button
                  type="button"
                  className="quiet-button"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </>
            ) : (
              <NavLink className="button primary" to="/login">
                Sign in
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={<BrowseRooms session={session} />}
          />
          <Route
  path="/properties/:id"
  element={<PropertyDetails session={session} />}
/>

          <Route
            path="/login"
            element={
              session ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SignIn
                  onSignedIn={handleSignedIn}
                  expired={expired}
                />
              )
            }
          />

          <Route
            path="/register"
            element={
              session ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Register />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              session ? (
                <div className="dashboard-page">
                  <div className="dashboard-heading">
                    <div>
                      <p className="eyebrow">
                        {roleLabel.toUpperCase()} WORKSPACE
                      </p>

                      <h1>Hello, {session.user.name}</h1>
                      <p>Manage your activity in one place.</p>
                    </div>

                    <span className="account-label">
                      {session.user.email}
                    </span>
                  </div>

                  <div
                    className="dashboard-surface"
                    key={session.user.id}
                  >
                    {role === "OWNER" && <OwnerDashboard />}
                    {role === "TENANT" && <TenantDashboard />}
                    {role === "ADMIN" && <AdminDashboard />}
                  </div>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="*"
            element={
              <section className="state-panel not-found">
                <h1>Page not found</h1>
                <p>Let’s get you back to available rooms.</p>

                <Link className="button primary" to="/">
                  Browse rooms
                </Link>
              </section>
            }
          />
        </Routes>
      </main>

      <footer className="site-footer">
        <div>
          <Link className="brand" to="/">
            Smart<span>Rent</span>
          </Link>
          <p>Find a place for your next chapter.</p>
        </div>

        <Link to="/">Browse available rooms</Link>
      </footer>
    </div>
  );
}