import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "TENANT",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    if (new TextEncoder().encode(form.password).length > 72) {
      setError("This password is too long. Please use a shorter password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      navigate("/login", {
        replace: true,
        state: { registered: true },
      });
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 409) {
        setError(
          "An account with this email already exists. Please sign in."
        );
      } else if (status === 400) {
        setError(
          "Please check your name, email, and password and try again."
        );
      } else if (status === 403) {
        setError("Registration is currently unavailable. Please try later.");
      } else {
        setError(
          "We couldn’t confirm registration. Try signing in before " +
            "submitting again."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h1>Find your place.<br />Or help someone find theirs.</h1>
        <p>
          Create a tenant account to save rooms and send rental requests,
          or an owner account to manage your listings.
        </p>
        <Link to="/">← Explore available rooms</Link>
      </div>

      <div className="auth-card">
        <p className="eyebrow">JOIN SMARTRENT</p>
        <h2>Create your account</h2>
        <p>Choose how you’d like to use SmartRent.</p>

        <form onSubmit={handleSubmit} className="stack-form">
          <fieldset className="account-options" disabled={busy}>
            <legend>I want to</legend>

            <label className={form.role === "TENANT" ? "selected" : ""}>
              <input
                type="radio"
                name="role"
                value="TENANT"
                checked={form.role === "TENANT"}
                onChange={handleChange}
              />
              <span>
                <strong>Find a room</strong>
                <small>Save rooms and request a rental</small>
              </span>
            </label>

            <label className={form.role === "OWNER" ? "selected" : ""}>
              <input
                type="radio"
                name="role"
                value="OWNER"
                checked={form.role === "OWNER"}
                onChange={handleChange}
              />
              <span>
                <strong>List my property</strong>
                <small>Manage rooms and tenant requests</small>
              </span>
            </label>
          </fieldset>

          <label htmlFor="register-name">
            Full name
            <input
              id="register-name"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              disabled={busy}
            />
          </label>

          <label htmlFor="register-email">
            Email address
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              maxLength={150}
              required
              disabled={busy}
            />
          </label>

          <label htmlFor="register-password">
            Password
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              maxLength={72}
              aria-describedby="password-guidance"
              required
              disabled={busy}
            />
          </label>

          <p id="password-guidance" className="field-help">
            Use at least 8 characters. Choose a password you don’t use
            for another account.
          </p>

          <label htmlFor="register-confirm-password">
            Confirm password
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              minLength={8}
              maxLength={72}
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
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
}