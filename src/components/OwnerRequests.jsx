import { useEffect, useState } from "react";
import api from "../services/api";

const cardStyle = {
  padding: "20px",
  border: "1px solid #dbe3ef",
  borderRadius: "12px",
  background: "#f8fafc",
};

export default function OwnerRequests({ onRentalChanged }) {
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRequests() {
      setLoading(true);
      setError("");

      try {
        const config = { signal: controller.signal };

        const [requestsResponse, propertiesResponse] = await Promise.all([
          api.get("/owner/rental-requests", config),
          api.get("/owner/properties", config),
        ]);

        if (
          !Array.isArray(requestsResponse.data) ||
          !Array.isArray(propertiesResponse.data)
        ) {
          throw new Error("Unexpected response");
        }

        if (!controller.signal.aborted) {
          setRequests(requestsResponse.data);
          setProperties(propertiesResponse.data);
        }
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        const status = requestError.response?.status;

        if (status === 401) {
          setError("Session expired. Log out and log in again.");
        } else if (status === 403) {
          setError("Your account cannot view these rental requests.");
        } else {
          setError("Could not load rental requests. Please refresh.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRequests();

    return () => controller.abort();
  }, [reload]);

  function propertyTitle(propertyId) {
    return (
      properties.find((property) => property.id === propertyId)?.title ||
      `Property #${propertyId}`
    );
  }

  async function handleDecision(request, status) {
    if (busyId !== null) {
      return;
    }

    const confirmation =
      status === "ACCEPTED"
        ? "Accept this request? This creates an active rental and marks " +
          "the room unavailable."
        : "Reject this rental request?";

    if (!window.confirm(confirmation)) {
      return;
    }

    setBusyId(request.id);
    setError("");
    setNotice("");

    try {
      await api.patch(`/rental-requests/${request.id}/status`, {
        status,
      });

      setNotice(
        status === "ACCEPTED"
          ? "Request accepted. An active rental was created."
          : "Request rejected."
      );

      setReload((value) => value + 1);
      onRentalChanged();
    } catch (requestError) {
      const responseStatus = requestError.response?.status;

      if (responseStatus === 401) {
        setError("Session expired. Log out and log in again.");
      } else if (responseStatus === 403) {
        setError("You cannot manage another owner's rental requests.");
      } else if (responseStatus === 404) {
        setError("Request not found. Refresh the list.");
      } else if (responseStatus === 409) {
        setError(
          "The request cannot be changed. It may already be processed, " +
            "the room may be unavailable or unverified, or the tenant " +
            "may already have an active rental. Refresh to check."
        );
      } else {
        setError(
          "Could not confirm the decision. Refresh before trying again."
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section style={{ marginTop: "32px" }}>
      <h2>Rental requests for my properties</h2>

      <button
        type="button"
        disabled={loading || busyId !== null}
        onClick={() => setReload((value) => value + 1)}
      >
        Refresh requests
      </button>

      {notice && (
        <p role="status" style={{ color: "#15803d" }}>
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {loading && <p role="status">Loading rental requests...</p>}

      {!loading && !error && requests.length === 0 && (
        <p>No rental requests yet.</p>
      )}

      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {requests.map((request) => (
            <article key={request.id} style={cardStyle}>
              <h3>{propertyTitle(request.propertyId)}</h3>

              <p>Request #{request.id}</p>
              <p>Tenant ID: {request.tenantId}</p>
              <p>{request.message}</p>

              <p>
                Status: <strong>{request.status}</strong>
              </p>

              {request.status === "PENDING" && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => handleDecision(request, "ACCEPTED")}
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => handleDecision(request, "REJECTED")}
                    style={{ color: "#b91c1c" }}
                  >
                    Reject
                  </button>
                </div>
              )}

              {busyId === request.id && (
                <p role="status">Saving decision...</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}