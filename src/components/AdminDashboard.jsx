import { useEffect, useState } from "react";
import api from "../services/api";

function AdminPhotos({ propertyId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const objectUrls = [];

    async function loadPhotos() {
      setLoading(true);
      setError("");
      setPhotos([]);

      try {
        const response = await api.get(
          `/manage/properties/${propertyId}/images`,
          { signal: controller.signal }
        );

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected photo response");
        }

        const previews = await Promise.all(
          response.data.map(async (photo) => {
            try {
              const image = await api.get(
                `/manage/properties/${propertyId}/images/${photo.id}/content`,
                {
                  responseType: "blob",
                  signal: controller.signal,
                }
              );

              if (controller.signal.aborted) return null;

              const url = URL.createObjectURL(image.data);
              objectUrls.push(url);
              return { id: photo.id, url };
            } catch {
              return { id: photo.id, url: null };
            }
          })
        );

        if (!controller.signal.aborted) {
          setPhotos(previews.filter(Boolean));
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;

        const status = requestError.response?.status;
        setError(
          status === 401
            ? "Session expired. Sign in again to view photos."
            : status === 403
              ? "Admin access to these photos was denied."
              : "Could not load photos. Use Refresh pending properties to retry."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPhotos();

    return () => {
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [propertyId]);

  return (
    <section style={{ margin: "16px 0" }}>
      <h4>Property photos</h4>

      {loading && <p role="status">Loading photos…</p>}
      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {!loading && !error && photos.length === 0 && (
        <p>No photos uploaded.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
        }}
      >
        {photos.map((photo, index) => (
          <figure key={photo.id} style={{ margin: 0 }}>
            {photo.url ? (
              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={photo.url}
                  alt={`Property photo ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "150px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    display: "block",
                  }}
                  onError={() =>
                    setPhotos((current) =>
                      current.map((item) =>
                        item.id === photo.id ? { ...item, url: null } : item
                      )
                    )
                  }
                />
              </a>
            ) : (
              <p>Photo preview unavailable.</p>
            )}

            <figcaption style={{ fontSize: "13px", marginTop: "4px" }}>
              {index === 0 ? "Cover photo" : `Photo ${index + 1}`}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

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
        if (controller.signal.aborted) return;

        const status = requestError.response?.status;
        setError(
          status === 401
            ? "Session expired. Log out and log in again."
            : status === 403
              ? "Only an admin can access this dashboard."
              : "Could not load pending properties."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPendingProperties();
    return () => controller.abort();
  }, [reload]);

  async function handleDecision(property, status) {
    if (busyId !== null) return;

    const action = status === "VERIFIED" ? "Verify" : "Reject";
    if (!window.confirm(`${action} "${property.title}"?`)) return;

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
        setError("The property's owner or rental status prevents this action.");
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
      <p>Review property details and photos before verification.</p>

      <button
        type="button"
        disabled={loading || busyId !== null}
        onClick={() => setReload((value) => value + 1)}
      >
        Refresh pending properties
      </button>

      {message && (
        <p role="status" style={{ color: "#15803d" }}>{message}</p>
      )}
      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>
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
                minWidth: 0,
              }}
            >
              <h3>{property.title}</h3>
              <p>{property.locality} · {property.roomType}</p>
              <p>₹{Number(property.rent).toLocaleString("en-IN")} / month</p>
              <p>{property.description}</p>
              <p>Owner ID: {property.ownerId ?? "Not assigned"}</p>
              <p>Status: {property.verificationStatus}</p>

              <AdminPhotos
                key={`${property.id}-${reload}`}
                propertyId={property.id}
              />

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