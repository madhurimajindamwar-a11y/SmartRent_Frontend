import { useEffect, useState } from "react";
import api from "../services/api";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const cardStyle = {
  border: "1px solid #dbe3ef",
  borderRadius: "12px",
  padding: "20px",
  background: "#f8fafc",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
  marginTop: "16px",
};

function TenantPhoto({ propertyId, photoId, title, number }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;

    async function loadPhoto() {
      setUrl("");
      setFailed(false);

      try {
        const response = await api.get(
          `/properties/${propertyId}/images/${photoId}/content`,
          {
            responseType: "blob",
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      }
    }

    loadPhoto();

    return () => {
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [propertyId, photoId]);

  if (failed) {
    return <p>Photo preview unavailable.</p>;
  }

  if (!url) {
    return <p role="status">Loading photo...</p>;
  }

  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt={`${title} — photo ${number}. Open full-size photo.`}
          onError={() => setFailed(true)}
          style={{
            display: "block",
            width: "100%",
            height: "190px",
            objectFit: "cover",
            borderRadius: "10px",
          }}
        />
      </a>

      <figcaption style={{ fontSize: "13px", marginTop: "5px" }}>
        {number === 1 ? "Cover photo" : `Photo ${number}`}
      </figcaption>
    </figure>
  );
}

function TenantPropertyPhotos({ propertyId, title }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPhotos() {
      setLoading(true);
      setError("");
      setPhotos([]);
      setExpanded(false);

      if (propertyId == null) {
        setError("Photos unavailable: missing property ID.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/properties/${propertyId}/images`,
          { signal: controller.signal }
        );

        if (
          !Array.isArray(response.data) ||
          response.data.some((photo) => photo?.id == null)
        ) {
          throw new Error("Unexpected photo response");
        }

        if (!controller.signal.aborted) {
          setPhotos(response.data);
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;

        const status = requestError.response?.status;

        setError(
          status === 403 || status === 404
            ? "Photos are not currently available for this listing."
            : "Could not load property photos."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPhotos();

    return () => controller.abort();
  }, [propertyId, retry]);

  return (
    <div style={{ margin: "12px 0 16px" }}>
      {loading && <p role="status">Loading photos...</p>}

      {!loading && error && (
        <div>
          <p role="status">{error}</p>

          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry photos
          </button>
        </div>
      )}

      {!loading && !error && photos.length === 0 && (
        <p style={{ color: "#475569" }}>
          No photos uploaded yet.
        </p>
      )}

      {!loading && !error && photos.length > 0 && (
        <>
          <TenantPhoto
            propertyId={propertyId}
            photoId={photos[0].id}
            title={title}
            number={1}
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((value) => !value)}
                style={{ marginTop: "10px" }}
              >
                {expanded
                  ? "Show cover only"
                  : `View all ${photos.length} photos`}
              </button>

              {expanded && (
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    marginTop: "12px",
                  }}
                >
                  {photos.slice(1).map((photo, index) => (
                    <TenantPhoto
                      key={photo.id}
                      propertyId={propertyId}
                      photoId={photo.id}
                      title={title}
                      number={index + 2}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function TenantDashboard() {
  const [tab, setTab] = useState("rooms");
  const [rooms, setRooms] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [requests, setRequests] = useState([]);
  const [rentals, setRentals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const config = { signal: controller.signal };

        const responses = await Promise.all([
          api.get("/properties/search", config),
          api.get("/favorites", config),
          api.get("/me/rental-requests", config),
          api.get("/me/rentals", config),
        ]);

        if (!responses.every((response) => Array.isArray(response.data))) {
          throw new Error("Unexpected dashboard response");
        }

        if (!controller.signal.aborted) {
          setRooms(responses[0].data);
          setFavorites(responses[1].data);
          setRequests(responses[2].data);
          setRentals(responses[3].data);
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;

        const status = requestError.response?.status;

        if (status === 401) {
          setError("Session expired. Log out and log in again.");
        } else if (status === 403) {
          setError("This dashboard requires a tenant account.");
        } else {
          setError("Could not load the dashboard. Click Refresh to retry.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [reload]);

  const hasActiveRental = rentals.some(
    (rental) => rental.status === "ACTIVE"
  );

  function isFavorite(propertyId) {
    return favorites.some((property) => property.id === propertyId);
  }

  function hasPendingRequest(propertyId) {
    return requests.some(
      (request) =>
        request.propertyId === propertyId &&
        request.status === "PENDING"
    );
  }

  function propertyTitle(propertyId) {
    const property =
      rooms.find((item) => item.id === propertyId) ||
      favorites.find((item) => item.id === propertyId);

    return property?.title || `Property #${propertyId}`;
  }

  function showActionError(requestError, conflictMessage) {
    const status = requestError.response?.status;

    if (status === 401) {
      setError("Session expired. Log out and log in again.");
    } else if (status === 403) {
      setError("You do not have permission to perform this action.");
    } else if (status === 404) {
      setError("The item is no longer available. Refresh the dashboard.");
    } else if (status === 409) {
      setError(conflictMessage);
    } else if (status === 400) {
      setError("Check your request details and try again.");
    } else {
      setError(
        "Could not confirm the action. Refresh the dashboard before retrying."
      );
    }
  }

  async function toggleFavorite(property) {
    if (busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    const removing = isFavorite(property.id);

    try {
      if (removing) {
        await api.delete(`/favorites/${property.id}`);
      } else {
        await api.post(`/favorites/${property.id}`);
      }

      setNotice(
        removing ? "Removed from favorites." : "Added to favorites."
      );

      setReload((value) => value + 1);
    } catch (requestError) {
      showActionError(
        requestError,
        "This property may already be saved. Refresh your favorites."
      );
    } finally {
      setBusy(false);
    }
  }

  function openRequestForm(property) {
    setSelectedRoom(property);
    setRequestMessage("I am interested in renting this room.");
    setError("");
    setNotice("");
  }

  async function submitRequest(event) {
    event.preventDefault();

    if (busy || !selectedRoom) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.post("/rental-requests", {
        propertyId: selectedRoom.id,
        message: requestMessage.trim(),
      });

      setSelectedRoom(null);
      setRequestMessage("");
      setNotice("Rental request sent. The owner can now review it.");
      setTab("requests");
      setReload((value) => value + 1);
    } catch (requestError) {
      showActionError(
        requestError,
        "Request blocked: the room may be unavailable, you may already " +
          "have a pending request for it, or you may have an active rental."
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest(requestId) {
    if (busy || !window.confirm("Cancel this rental request?")) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.patch(`/rental-requests/${requestId}/cancel`);
      setNotice("Rental request cancelled.");
      setReload((value) => value + 1);
    } catch (requestError) {
      showActionError(
        requestError,
        "This request is no longer pending. Refresh to see its status."
      );
    } finally {
      setBusy(false);
    }
  }

  const displayedProperties = tab === "favorites" ? favorites : rooms;

  return (
    <section style={{ marginTop: "32px" }}>
      <h2>Tenant dashboard</h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {[
          ["rooms", "Available rooms"],
          ["favorites", "My favorites"],
          ["requests", "My requests"],
          ["rentals", "My rentals"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            disabled={busy}
            onClick={() => {
              setTab(value);
              setSelectedRoom(null);
            }}
            style={{
              fontWeight: tab === value ? "bold" : "normal",
              borderBottom:
                tab === value ? "3px solid #2458ed" : undefined,
            }}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          disabled={loading || busy}
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh
        </button>
      </div>

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

      {loading && (
        <p role="status">Loading your dashboard...</p>
      )}

      {!loading && !error && (
        <>
          {hasActiveRental && (
            <p>
              You have an active rental. You can save favorites, but new
              rental requests are blocked while that rental is active.
            </p>
          )}

          {selectedRoom && (
            <form
              onSubmit={submitRequest}
              style={{ ...cardStyle, marginBottom: "20px" }}
            >
              <h3>Request: {selectedRoom.title}</h3>

              <label htmlFor="rental-message">
                Message to the owner
              </label>

              <textarea
                id="rental-message"
                value={requestMessage}
                onChange={(event) =>
                  setRequestMessage(event.target.value)
                }
                maxLength={1000}
                rows={3}
                disabled={busy}
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  margin: "10px 0",
                  padding: "10px",
                }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  disabled={busy || hasActiveRental}
                >
                  {busy ? "Sending..." : "Send rental request"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedRoom(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {(tab === "rooms" || tab === "favorites") && (
            <>
              {displayedProperties.length === 0 && (
                <p>
                  {tab === "favorites"
                    ? "You have no saved properties."
                    : "No available verified rooms were found."}
                </p>
              )}

              <div style={gridStyle}>
                {displayedProperties.map((property) => (
                  <article key={property.id} style={cardStyle}>
                    <h3>{property.title}</h3>

                    <TenantPropertyPhotos
                      key={`${property.id}-${reload}`}
                      propertyId={property.id}
                      title={property.title}
                    />

                    <p>
                      {property.locality} · {property.roomType}
                    </p>

                    <p>
                      <strong>{currency.format(property.rent)}</strong>
                      {" / month"}
                    </p>

                    <p>{property.description}</p>

                    <p>
                      {property.available ? "Available" : "Unavailable"}
                    </p>

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
                        onClick={() => toggleFavorite(property)}
                      >
                        {isFavorite(property.id)
                          ? "Remove favorite"
                          : "Save favorite"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy ||
                          !property.available ||
                          hasActiveRental ||
                          hasPendingRequest(property.id)
                        }
                        onClick={() => openRequestForm(property)}
                      >
                        {hasPendingRequest(property.id)
                          ? "Request pending"
                          : "Request rental"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {tab === "requests" && (
            <>
              {requests.length === 0 && (
                <p>No rental requests yet.</p>
              )}

              <div style={gridStyle}>
                {requests.map((request) => (
                  <article key={request.id} style={cardStyle}>
                    <h3>{propertyTitle(request.propertyId)}</h3>
                    <p>Request #{request.id}</p>
                    <p>{request.message}</p>

                    <p>
                      Status: <strong>{request.status}</strong>
                    </p>

                    {request.status === "PENDING" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => cancelRequest(request.id)}
                      >
                        Cancel request
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}

          {tab === "rentals" && (
            <>
              {rentals.length === 0 && (
                <p>No rental records yet.</p>
              )}

              <div style={gridStyle}>
                {rentals.map((rental) => (
                  <article key={rental.id} style={cardStyle}>
                    <h3>{propertyTitle(rental.propertyId)}</h3>
                    <p>Rental #{rental.id}</p>

                    <p>
                      Agreed rent: {currency.format(rental.agreedRent)}
                      {" / month"}
                    </p>

                    <p>Start date: {rental.startDate}</p>
                    <p>End date: {rental.endDate || "Not set"}</p>

                    <p>
                      Status: <strong>{rental.status}</strong>
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}