import { useEffect, useState } from "react";
import api from "../services/api";
import PropertyActions from "./PropertyActions";
import OwnerRequests from "./OwnerRequests";
import PropertyPhotos from "./PropertyPhotos";

const emptyForm = {
  title: "",
  description: "",
  locality: "",
  rent: "",
  roomType: "SINGLE",
  wifi: false,
  food: false,
  ac: false,
  available: true,
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const cardStyle = {
  padding: "20px",
  border: "1px solid #dbe3ef",
  borderRadius: "12px",
  background: "#f8fafc",
};

export default function OwnerDashboard() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProperties() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/owner/properties", {
          signal: controller.signal,
        });

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected response");
        }

        if (!controller.signal.aborted) {
          setProperties(response.data);
        }
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        const status = requestError.response?.status;

        if (status === 401) {
          setError("Session expired. Log out and log in again.");
        } else if (status === 403) {
          setError("You do not have permission to view these properties.");
        } else {
          setError("Could not load properties. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProperties();

    return () => controller.abort();
  }, [reload]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setSuccess("");
    setFormError("");
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setFormError("");
    setSuccess("");

    const rent = Number(form.rent);

    if (!form.title.trim() || !form.locality.trim()) {
      setFormError("Enter a title and locality.");
      return;
    }

    if (form.rent === "" || !Number.isFinite(rent) || rent < 0) {
      setFormError("Enter a valid rent of zero or more.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/properties", {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        locality: form.locality.trim(),
        rent,
      });

      setForm({ ...emptyForm });
      setSuccess("Property created. It is pending admin verification.");
      setReload((value) => value + 1);
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 401) {
        setFormError("Session expired. Log out and log in again.");
      } else if (status === 403) {
        setFormError("Your account cannot create properties.");
      } else if (status === 400) {
        setFormError("Check the property details and try again.");
      } else {
        setFormError(
          "Could not confirm creation. Refresh your properties before retrying."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ marginTop: "32px" }}>
      <h2>Add a property</h2>

      <form onSubmit={handleCreate}>
        <fieldset
          disabled={saving}
          style={{
            display: "grid",
            gap: "16px",
            border: "none",
            padding: 0,
            margin: 0,
          }}
        >
          <label htmlFor="property-title">
            Property title
            <input
              id="property-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              maxLength={150}
              required
              style={inputStyle}
            />
          </label>

          <label htmlFor="property-description">
            Description
            <textarea
              id="property-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={2000}
              rows={3}
              style={inputStyle}
            />
          </label>

          <label htmlFor="property-locality">
            Locality
            <input
              id="property-locality"
              name="locality"
              value={form.locality}
              onChange={handleChange}
              maxLength={100}
              required
              style={inputStyle}
            />
          </label>

          <label htmlFor="property-rent">
            Monthly rent (₹)
            <input
              id="property-rent"
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

          <label htmlFor="property-room-type">
            Room type
            <select
              id="property-room-type"
              name="roomType"
              value={form.roomType}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="SINGLE">Single</option>
              <option value="SHARED">Shared</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {[
              ["wifi", "Wi-Fi"],
              ["food", "Food"],
              ["ac", "AC"],
              ["available", "Available"],
            ].map(([name, label]) => (
              <label key={name}>
                <input
                  type="checkbox"
                  name={name}
                  checked={form[name]}
                  onChange={handleChange}
                />{" "}
                {label}
              </label>
            ))}
          </div>

          <button type="submit">
            {saving ? "Creating..." : "Create property"}
          </button>
        </fieldset>
      </form>

      {formError && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {formError}
        </p>
      )}

      {success && (
        <p role="status" style={{ color: "#15803d" }}>
          {success}
        </p>
      )}

      <h2 style={{ marginTop: "32px" }}>My properties</h2>

      <button
        type="button"
        disabled={loading || saving}
        onClick={() => setReload((value) => value + 1)}
        style={{ marginBottom: "16px" }}
      >
        Refresh properties
      </button>

      {loading && <p role="status">Loading properties...</p>}

      {!loading && error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {!loading && !error && properties.length === 0 && (
        <p>You haven’t added any properties yet.</p>
      )}

      {!loading && !error && properties.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {properties.map((property) => (
            <article key={property.id} style={cardStyle}>
              <h3>{property.title}</h3>
              <p>
                {property.locality} · {property.roomType}
              </p>
              <p>
                <strong>{currency.format(property.rent)}</strong>
                {" / month"}
              </p>
              <p>{property.description}</p>
              <p>
                Availability:{" "}
                {property.available ? "Available" : "Unavailable"}
              </p>
              <p>Verification: {property.verificationStatus}</p>
              <p>
                Wi-Fi: {property.wifi ? "Yes" : "No"}
                {" · "}Food: {property.food ? "Yes" : "No"}
                {" · "}AC: {property.ac ? "Yes" : "No"}
              </p>
              <PropertyPhotos property={property} />
              <PropertyActions
    property={property}
    onChanged={() => setReload((value) => value + 1)}
    />
    <PropertyPhotos propertyId={property.id} />
</article>
          ))}
        </div>
      )}
    <OwnerRequests
onRentalChanged={() => setReload((value) => value + 1)}
/>
    </section>
);
}