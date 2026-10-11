import { useRef, useState } from "react";
import api from "../services/api";

function toForm(property) {
  return {
    title: property.title ?? "",
    description: property.description ?? "",
    locality: property.locality ?? "",
    rent: String(property.rent ?? ""),
    roomType: property.roomType ?? "SINGLE",
    wifi: Boolean(property.wifi),
    food: Boolean(property.food),
    ac: Boolean(property.ac),
    available: Boolean(property.available),
  };
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "11px",
  marginTop: "7px",
  border: "1px solid #bdcec7",
  borderRadius: "8px",
  background: "#fff",
};

const checkboxStyle = {
  position: "static",
  appearance: "auto",
  width: "20px",
  height: "20px",
  minHeight: 0,
  margin: 0,
  padding: 0,
  flex: "0 0 20px",
  accentColor: "#166653",
};

export default function PropertyActions({ property, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(property));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);

  function startEditing() {
    setForm(toForm(property));
    setError("");
    setMessage("");
    setEditing(true);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  }

  function showError(requestError) {
    const status = requestError.response?.status;

    if (status === 401) {
      setError("Your session ended. Please sign in again.");
    } else if (status === 403) {
      setError("You cannot change this property.");
    } else if (status === 404) {
      setError("Property not found. Refresh your properties.");
    } else if (status === 409) {
      setError(
        "An active rental cannot be made available. Properties with " +
          "request history cannot be deleted; mark them unavailable instead."
      );
    } else if (status === 400) {
      setError("Check the property details and try again.");
    } else {
      setError(
        "Could not confirm the change. Refresh your properties before retrying."
      );
    }
  }

  async function saveProperty(payload, successMessage) {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await api.put(`/properties/${property.id}`, payload);
      setEditing(false);
      setMessage(successMessage);
      onChanged?.();
    } catch (requestError) {
      showError(requestError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (lock.current) return;

    const rent = Number(form.rent);

    if (!form.title.trim() || !form.locality.trim()) {
      setError("Enter a property title and locality.");
      return;
    }

    if (
      form.rent.trim() === "" ||
      !Number.isFinite(rent) ||
      rent < 0 ||
      rent > 99999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(form.rent.trim())
    ) {
      setError(
        "Enter rent between 0 and 99999999.99 with at most two decimal places."
      );
      return;
    }

    await saveProperty(
      {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        locality: form.locality.trim(),
        rent,
      },
      "Property saved. Changes to listing details require admin review."
    );
  }

  async function handleAvailability() {
    if (lock.current) return;

    const available = !property.available;

    if (
      !window.confirm(
        available
          ? `Mark "${property.title}" available? It will appear publicly when verified.`
          : `Mark "${property.title}" unavailable? It will be removed from available-room search.`
      )
    ) {
      return;
    }

    await saveProperty(
      {
        ...toForm(property),
        rent: Number(property.rent),
        available,
      },
      available
        ? "Property marked available. Public visibility requires admin verification."
        : "Property marked unavailable and removed from available-room search."
    );
  }

  async function handleDelete() {
    if (lock.current) return;

    if (
      !window.confirm(
        `Permanently delete "${property.title}"? ` +
          "For listings with rental history, use Mark unavailable instead."
      )
    ) {
      return;
    }

    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await api.delete(`/properties/${property.id}`);
      onChanged?.();
    } catch (requestError) {
      showError(requestError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "20px" }}>
      {editing ? (
        <form onSubmit={handleUpdate}>
          <fieldset
            disabled={busy}
            style={{
              display: "grid",
              gap: "16px",
              minWidth: 0,
              border: 0,
              margin: 0,
              padding: 0,
            }}
          >
            <legend style={{ marginBottom: "16px", fontWeight: 700 }}>
              Edit property details
            </legend>

            <label htmlFor={`edit-title-${property.id}`}>
              Property title
              <input
                id={`edit-title-${property.id}`}
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={150}
                required
                style={inputStyle}
              />
            </label>

            <label htmlFor={`edit-description-${property.id}`}>
              Description
              <textarea
                id={`edit-description-${property.id}`}
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={2000}
                rows={4}
                style={inputStyle}
              />
            </label>

            <label htmlFor={`edit-locality-${property.id}`}>
              Locality
              <input
                id={`edit-locality-${property.id}`}
                name="locality"
                value={form.locality}
                onChange={handleChange}
                maxLength={100}
                required
                style={inputStyle}
              />
            </label>

            <label htmlFor={`edit-rent-${property.id}`}>
              Monthly rent (₹)
              <input
                id={`edit-rent-${property.id}`}
                name="rent"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                value={form.rent}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </label>

            <label htmlFor={`edit-room-type-${property.id}`}>
              Room type
              <select
                id={`edit-room-type-${property.id}`}
                name="roomType"
                value={form.roomType}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="SINGLE">Single room</option>
                <option value="SHARED">Shared room</option>
              </select>
            </label>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              {[
                ["wifi", "Wi-Fi"],
                ["food", "Food service"],
                ["ac", "Air conditioning"],
                ["available", "Available"],
              ].map(([name, label]) => (
                <label
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    padding: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name={name}
                    checked={form[name]}
                    onChange={handleChange}
                    style={checkboxStyle}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <p style={{ margin: 0, lineHeight: 1.6, color: "#526477" }}>
              Changing listing details sends the property for admin
              review again. An actively rented property must remain
              unavailable.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <button type="submit" className="primary">
                {busy ? "Saving…" : "Save changes"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={startEditing}
          >
            Edit details
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleAvailability}
          >
            {property.available ? "Mark unavailable" : "Mark available"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            style={{ color: "#b91c1c" }}
          >
            Delete listing
          </button>
        </div>
      )}

      {busy && <p role="status">Saving property changes…</p>}

      {error && (
        <p role="alert" style={{ color: "#b91c1c", lineHeight: 1.6 }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: "#15803d", lineHeight: 1.6 }}>
          {message}
        </p>
      )}
    </div>
  );
}