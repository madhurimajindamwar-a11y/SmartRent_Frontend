import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function PropertyDetails({ session }) {
  const { id } = useParams();
  const tenantId =
    session?.user.role === "TENANT" ? session.user.id : null;

  const [property, setProperty] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [pending, setPending] = useState(false);
  const [activeRental, setActiveRental] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  const [showRequest, setShowRequest] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadDetails() {
      setLoading(true);
      setLoadError("");
      setActionError("");
      setNotice("");
      setShowRequest(false);
      setProperty(null);
      setFavorite(false);
      setPending(false);
      setActiveRental(false);

      try {
        const config = { signal: controller.signal };
        const propertyId = Number(id);

        if (!Number.isSafeInteger(propertyId) || propertyId <= 0) {
          setLoadError("This property link is invalid.");
          return;
        }

        const propertyResponse = await api.get(
          `/properties/${id}`,
          config
        );

        if (
          !propertyResponse.data ||
          Number(propertyResponse.data.id) !== propertyId
        ) {
          throw new Error("Unexpected property response");
        }

        let saved = false;
        let requested = false;
        let renting = false;

        if (tenantId) {
          const responses = await Promise.all([
            api.get("/favorites", config),
            api.get("/me/rental-requests", config),
            api.get("/me/rentals", config),
          ]);

          if (!responses.every((response) => Array.isArray(response.data))) {
            throw new Error("Unexpected account response");
          }

          saved = responses[0].data.some(
            (item) => Number(item.id) === propertyId
          );

          requested = responses[1].data.some(
            (item) =>
              Number(item.propertyId) === propertyId &&
              item.status === "PENDING"
          );

          renting = responses[2].data.some(
            (item) => item.status === "ACTIVE"
          );
        }

        if (!controller.signal.aborted) {
          setProperty(propertyResponse.data);
          setFavorite(saved);
          setPending(requested);
          setActiveRental(renting);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error.response?.status === 404) {
          setLoadError(
            "This listing is unavailable or is no longer approved for public viewing."
          );
        } else if (error.response?.status === 401) {
          setLoadError("Your session ended. Please sign in again.");
        } else {
          setLoadError("We couldn’t load this property. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => controller.abort();
  }, [id, tenantId, reload]);

  function reportError(error, conflictMessage) {
    const status = error.response?.status;

    if (status === 401) {
      setActionError("Your session ended. Please sign in again.");
    } else if (status === 403) {
      setActionError("This action requires an authorized tenant account.");
    } else if (status === 404) {
      setActionError("This item is no longer available. Refresh the details.");
    } else if (status === 409) {
      setActionError(conflictMessage);
    } else if (status === 400) {
      setActionError("Please check your request and try again.");
    } else {
      setActionError(
        "We couldn’t confirm the action. Refresh the details before retrying."
      );
    }
  }

  async function toggleFavorite() {
    if (busy || !tenantId) return;

    setBusy(true);
    setActionError("");
    setNotice("");

    try {
      if (favorite) {
        await api.delete(`/favorites/${id}`);
      } else {
        await api.post(`/favorites/${id}`);
      }

      setFavorite(!favorite);
      setNotice(favorite ? "Removed from saved rooms." : "Room saved.");
    } catch (error) {
      reportError(
        error,
        "Your saved rooms may have changed. Refresh the details."
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendRequest(event) {
    event.preventDefault();

    if (
      busy ||
      !tenantId ||
      pending ||
      activeRental ||
      !property?.available
    ) {
      return;
    }

    setBusy(true);
    setActionError("");
    setNotice("");

    try {
      await api.post("/rental-requests", {
        propertyId: Number(id),
        message: message.trim(),
      });

      setPending(true);
      setShowRequest(false);
      setMessage("");
      setNotice("Request sent. Track the owner’s response in your dashboard.");
    } catch (error) {
      reportError(
        error,
        "The room may no longer be available, you may already have a " +
          "pending request, or you may have an active rental. Refresh to check."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="details-page">
      <Link className="back-link" to="/">
        ← Browse rooms
      </Link>

      {loading && (
        <div className="state-panel" role="status">
          Loading property details…
        </div>
      )}

      {!loading && loadError && (
        <div className="state-panel" role="alert">
          <h1>Unable to display this room</h1>
          <p>{loadError}</p>
          <button onClick={() => setReload((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}

      {!loading && !loadError && property && (
        <>
          <div className="details-heading">
            <p className="eyebrow">{property.locality}</p>
            <h1>{property.title}</h1>

            <div className="details-tags">
              <span className="badge">
                {property.roomType === "SINGLE"
                  ? "Single room"
                  : property.roomType === "SHARED"
                    ? "Shared room"
                    : property.roomType}
              </span>

              {property.verificationStatus === "VERIFIED" && (
                <span className="badge">Admin reviewed</span>
              )}

              <span className="badge">
                {property.available ? "Available" : "Currently unavailable"}
              </span>
            </div>
          </div>

          <div className="details-layout">
            <div className="details-main">
              <section className="details-section">
                <h2>About this room</h2>
                <p>
                  {property.description ||
                    "The owner has not added a description yet."}
                </p>
              </section>

              <section className="details-section">
                <h2>Listed amenities</h2>

                <dl className="details-facts">
                  <div>
                    <dt>Wi-Fi</dt>
                    <dd>{property.wifi ? "Listed" : "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Food service</dt>
                    <dd>{property.food ? "Listed" : "Not listed"}</dd>
                  </div>
                  <div>
                    <dt>Air conditioning</dt>
                    <dd>{property.ac ? "Listed" : "Not listed"}</dd>
                  </div>
                </dl>

                <p className="field-help">
                  Confirm availability and any separate charges with the owner.
                </p>
              </section>

              <section className="details-section">
                <h2>Before you decide</h2>
                <ul className="details-checklist">
                  <li>Ask about the deposit and total move-in cost.</li>
                  <li>Confirm electricity, water, food, and maintenance charges.</li>
                  <li>Check the room condition and house rules.</li>
                </ul>
                <p>
                  Admin review means the listing was approved in SmartRent.
                  It does not guarantee a physical inspection.
                </p>
              </section>
            </div>

            <aside className="rental-summary" aria-label="Rent and actions">
              <p className="eyebrow">MONTHLY RENT</p>
              <p className="details-price">
                {currency.format(property.rent)}
                <span> / month</span>
              </p>
              <p className="cost-note">
                Deposit and additional charges are not recorded for this
                listing. Confirm the total cost with the owner.
              </p>

              {!session && (
                <>
                  <Link className="button primary" to="/login">
                    Sign in to save or request
                  </Link>
                  <p className="auth-switch">
                    New here? <Link to="/register">Create an account</Link>
                  </p>
                </>
              )}

              {session && !tenantId && (
                <>
                  <p>
                    You’re signed in as an {session.user.role.toLowerCase()}.
                    Rental requests are available to tenant accounts.
                  </p>
                  <Link className="button" to="/dashboard">
                    Open dashboard
                  </Link>
                </>
              )}

              {tenantId && (
                <div className="details-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={toggleFavorite}
                    aria-pressed={favorite}
                  >
                    {favorite ? "Remove saved room" : "Save this room"}
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={
                      busy ||
                      pending ||
                      activeRental ||
                      !property.available ||
                      showRequest
                    }
                    onClick={() => {
                      setShowRequest(true);
                      setActionError("");
                      setNotice("");
                    }}
                  >
                    {pending
                      ? "Request pending"
                      : !property.available
                        ? "Room unavailable"
                        : "Request rental"}
                  </button>

                  {activeRental && (
                    <p className="field-help">
                      You already have an active rental. New requests are
                      blocked while it remains active.
                    </p>
                  )}

                  {showRequest && (
                    <form className="stack-form" onSubmit={sendRequest}>
                      <label htmlFor="owner-message">
                        Message to the owner (optional)
                      </label>
                      <textarea
                        id="owner-message"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        maxLength={1000}
                        rows={4}
                        disabled={busy}
                        placeholder="Introduce yourself or ask about the room."
                      />

                      <button
                        type="submit"
                        className="primary"
                        disabled={busy}
                      >
                        {busy ? "Sending…" : "Send request"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setShowRequest(false)}
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  <Link to="/dashboard">View saved rooms and requests →</Link>
                </div>
              )}

              {notice && (
                <p className="details-notice" role="status">
                  {notice}
                </p>
              )}

              {actionError && (
                <div role="alert">
                  <p className="error-text">{actionError}</p>
                  <button
                    disabled={busy}
                    onClick={() => setReload((value) => value + 1)}
                  >
                    Refresh details
                  </button>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}