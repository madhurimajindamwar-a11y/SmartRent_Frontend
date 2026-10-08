import { useState } from "react";
import api from "../services/api";

export default function PropertyActions({ property, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [rent, setRent] = useState(String(property.rent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function startEditing() {
    setRent(String(property.rent));
    setError("");
    setMessage("");
    setEditing(true);
  }

  function showError(requestError, action) {
    const status = requestError.response?.status;

    if (status === 401) {
      setError("Session expired. Log out and log in again.");
    } else if (status === 403) {
      setError("You do not have permission to change this property.");
    } else if (status === 404) {
      setError("Property not found. Refresh your properties.");
    } else if (status === 409) {
      setError(
        "This change is blocked by the property's rental or request history."
      );
    } else if (status === 400) {
      setError("Check the entered details and try again.");
    } else {
      setError(
        `Could not confirm ${action}. Refresh your properties before retrying.`
      );
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setError("");
    setMessage("");

    const updatedRent = Number(rent);

    if (
      rent.trim() === "" ||
      !Number.isFinite(updatedRent) ||
      updatedRent < 0 ||
      updatedRent > 99999999.99
    ) {
      setError("Enter a valid rent between 0 and 99999999.99.");
      return;
    }

    setBusy(true);

    try {
      // Send the editable fields expected by the existing PUT endpoint.
      await api.put(`/properties/${property.id}`, {
        title: property.title,
        description: property.description,
        locality: property.locality,
        rent: updatedRent,
        roomType: property.roomType,
        wifi: property.wifi,
        food: property.food,
        ac: property.ac,
        available: property.available,
      });

      setEditing(false);
      setMessage("Rent updated.");
      onChanged();
    } catch (requestError) {
      showError(requestError, "the update");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${property.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await api.delete(`/properties/${property.id}`);
      onChanged();
    } catch (requestError) {
      showError(requestError, "deletion");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "16px" }}>
      {editing ? (
        <form onSubmit={handleUpdate}>
          <label htmlFor={`edit-rent-${property.id}`}>
            Monthly rent (₹)
          </label>

          <input
            id={`edit-rent-${property.id}`}
            type="number"
            min="0"
            max="99999999.99"
            step="0.01"
            required
            disabled={busy}
            value={rent}
            onChange={(event) => setRent(event.target.value)}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              margin: "8px 0",
              padding: "10px",
            }}
          />

          <p>Changing the rent requires admin verification again.</p>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save rent"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            disabled={busy}
            onClick={startEditing}
          >
            Edit rent
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            style={{ color: "#b91c1c" }}
          >
            {busy ? "Processing..." : "Delete"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: "#15803d" }}>
          {message}
        </p>
      )}
    </div>
  );
}