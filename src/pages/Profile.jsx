import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { updateSessionUser } from "../services/auth";

export default function Profile({ onProfileUpdated }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const saving = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/me/profile", {
          signal: controller.signal,
        });

        const user = response.data;

        if (
          user?.id == null ||
          typeof user.name !== "string" ||
          typeof user.email !== "string"
        ) {
          throw new Error("Unexpected profile response");
        }

        if (!controller.signal.aborted) {
          setForm({
            name: user.name,
            email: user.email,
            currentPassword: "",
          });
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setError(
          requestError.response?.status === 401
            ? "Your session ended. Please sign in again."
            : "Could not load your profile. Please retry."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProfile();
    return () => controller.abort();
  }, [reload]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving.current || loading) return;

    setError("");
    setNotice("");

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) {
      setError("Enter your name and email address.");
      return;
    }

    if (
      !form.currentPassword.trim() ||
      new TextEncoder().encode(form.currentPassword).length > 72
    ) {
      setError("Enter a valid current password.");
      return;
    }

    saving.current = true;
    setBusy(true);

    try {
      const response = await api.put("/me/profile", {
        name,
        email,
        currentPassword: form.currentPassword,
      });

      const user = response.data;

      if (
        user?.id == null ||
        typeof user.name !== "string" ||
        typeof user.email !== "string"
      ) {
        throw new Error("Unexpected profile response");
      }

      const updatedSession = updateSessionUser(user);
      onProfileUpdated(updatedSession);

      setForm({
        name: user.name,
        email: user.email,
        currentPassword: "",
      });
      setNotice("Profile updated successfully.");
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 400) {
        setError(
          "Check your details and current password. The password may be incorrect."
        );
      } else if (status === 409) {
        setError(
          "That email may already be registered. Choose another email address."
        );
      } else if (status === 401) {
        setError("Your session ended. Please sign in again.");
      } else if (status === 403) {
        setError("You cannot update this profile.");
      } else {
        setError(
          "Could not confirm the update. Reload your profile before retrying."
        );
      }

      setForm((previous) => ({
        ...previous,
        currentPassword: "",
      }));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className="auth-card"
      style={{ maxWidth: "640px", margin: "32px auto" }}
    >
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>My profile</h1>
      <p>
        Update your name and email. Confirm changes with your current
        password.
      </p>

      {loading && <p role="status">Loading your profile…</p>}

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="stack-form">
          <label htmlFor="profile-name">
            Full name
            <input
              id="profile-name"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              disabled={busy}
            />
          </label>

          <label htmlFor="profile-email">
            Email address
            <input
              id="profile-email"
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

          <label htmlFor="profile-password">
            Current password
            <input
              id="profile-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={handleChange}
              maxLength={72}
              required
              disabled={busy}
            />
          </label>

          <button
            type="submit"
            className="primary"
            disabled={busy || !form.name || !form.email}
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
          marginTop: "20px",
        }}
      >
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => {
            setNotice("");
            setReload((value) => value + 1);
          }}
        >
          Reload profile
        </button>

        <Link to="/dashboard">Back to dashboard</Link>
      </div>
    </section>
  );
}