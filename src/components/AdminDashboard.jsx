import { useEffect, useState } from "react";
import api from "../services/api";

export default function AdminDashboard() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPendingProperties() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/admin/properties", {
          params: { status: "PENDING" },
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
          setError("Only an admin can access this dashboard.");
        } else {
          setError("Could not load pending properties.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPendingProperties();

    return () => controller.abort();
  }, [reload]);

  async function handleDecision(property, status) {
    if (busyId !== null) {
      return;
    }

    const action = status === "VERIFIED" ? "Verify" : "Reject";

    if (!window.confirm(`${action} "${property.title}"?`)) {
      return;
    }

    setBusyId(property.id);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `/admin/properties/${property.id}/verification`,
        { status }
      );

      setMessage(
        `"${property.title}" ${
          status === "VERIFIED" ? "verified" : "rejected"
        } successfully.`
      );

      setReload((value) => value + 1);
    } catch (requestError) {
      const responseStatus = requestError.response?.status;

      if (responseStatus === 401) {
        setError("Session expired. Log out and log in again.");
      } else if (responseStatus === 403) {
        setError("Only an admin can verify properties.");
      } else if (responseStatus === 409) {
        setError(
          "The property's owner or rental status prevents this action."
        );
      } else if (responseStatus === 404) {
        setError("Property not found. Refresh the list.");
      } else {
        setError(
          "Could not confirm the change. Refresh the list before retrying."
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section style={{ marginTop: "32px" }}>
      <h2>Admin dashboard</h2>
      <p>Review properties awaiting verification.</p>

      <button
        type="button"
        disabled={loading || busyId !== null}
        onClick={() => setReload((value) => value + 1)}
      >
        Refresh pending properties
      </button>

      {message && (
        <p role="status" style={{ color: "#15803d" }}>
          {message}
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {loading && <p role="status">Loading pending properties...</p>}

      {!loading && !error && properties.length === 0 && (
        <p>No properties are waiting for verification.</p>
      )}

      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          {properties.map((property) => (
            <article
              key={property.id}
              style={{
                border: "1px solid #dbe3ef",
                borderRadius: "12px",
                padding: "20px",
                background: "#f8fafc",
              }}
            >
              <h3>{property.title}</h3>

              <p>
                {property.locality} · {property.roomType}
              </p>

              <p>
                ₹{Number(property.rent).toLocaleString("en-IN")} / month
              </p>

              <p>{property.description}</p>
              <p>Owner ID: {property.ownerId ?? "Not assigned"}</p>
              <p>Status: {property.verificationStatus}</p>

              {!property.ownerId && (
                <p style={{ color: "#b45309" }}>
                  An owner must be assigned before verification.
                </p>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  disabled={busyId !== null || !property.ownerId}
                  onClick={() => handleDecision(property, "VERIFIED")}
                >
                  Verify
                </button>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => handleDecision(property, "REJECTED")}
                  style={{ color: "#b91c1c" }}
                >
                  Reject
                </button>
              </div>

              {busyId === property.id && (
                <p role="status">Saving decision...</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}