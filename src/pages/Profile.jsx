import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { updateSessionUser } from "../services/auth";

export default function Profile({ onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const saving = useRef(false);
  const heading = useRef(null);

  function validateUser(user) {
    if (
      user?.id == null ||
      typeof user.name !== "string" ||
      typeof user.email !== "string"
    ) {
      throw new Error("Unexpected profile response");
    }

    return user;
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/me/profile", {
          signal: controller.signal,
        });

        const user = validateUser(response.data);

        if (!controller.signal.aborted) {
          setProfile(user);
          setEditing(false);
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

  function startEditing() {
    setForm({
      name: profile.name,
      email: profile.email,
      currentPassword: "",
    });
    setError("");
    setNotice("");
    setEditing(true);
  }

  function cancelEditing() {
    setForm({
      name: profile.name,
      email: profile.email,
      currentPassword: "",
    });
    setError("");
    setNotice("");
    setEditing(false);
    heading.current?.focus();
  }

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

    if (saving.current || loading || !profile) return;

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

      const user = validateUser(response.data);
      const updatedSession = updateSessionUser(user);

      onProfileUpdated(updatedSession);

      setProfile(user);
      setForm({
        name: user.name,
        email: user.email,
        currentPassword: "",
      });
      setEditing(false);
      setNotice("Profile updated successfully.");
      heading.current?.focus();
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

  const roleLabel =
    profile?.role === "OWNER"
      ? "Property owner"
      : profile?.role === "ADMIN"
        ? "Administrator"
        : "Tenant";

  return (
    <section
      className="auth-card"
      style={{ maxWidth: "640px", margin: "32px auto" }}
    >
      <p className="eyebrow">YOUR ACCOUNT</p>

      <h1 ref={heading} tabIndex={-1}>
        {editing ? "Edit profile" : "My profile"}
      </h1>

      <p>
        {editing
          ? "Update your details and confirm with your current password."
          : "Your saved account information."}
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

      {!loading && profile && !editing && (
        <>
          <dl style={{ margin: "24px 0" }}>
            {[
              ["Full name", profile.name],
              ["Email address", profile.email],
              ["Account type", roleLabel],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <dt
                  style={{
                    fontSize: "14px",
                    color: "#475569",
                    marginBottom: "6px",
                  }}
                >
                  {label}
                </dt>
                <dd
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    overflowWrap: "anywhere",
                  }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <button
            type="button"
            className="primary"
            onClick={startEditing}
          >
            Edit profile
          </button>
        </>
      )}

      {!loading && profile && editing && (
        <form onSubmit={handleSubmit} className="stack-form">
          <label htmlFor="profile-name">
            Full name
            <input
              id="profile-name"
              name="name"
              autoComplete="name"
              autoFocus
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

          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={cancelEditing}
          >
            Cancel
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
        {(!profile || error) && (
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
        )}

        <Link to="/dashboard">Back to dashboard</Link>
      </div>
    </section>
  );
}