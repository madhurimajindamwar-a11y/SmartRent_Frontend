import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const statusLabels = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

export default function Maintenance({ session }) {
  const isTenant = session?.user?.role === "TENANT";
  const [requests, setRequests] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [form, setForm] = useState({
    rentalId: "",
    title: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const locked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const config = { signal: controller.signal };
        const [requestResponse, rentalResponse] = await Promise.all([
          api.get("/maintenance", config),
          isTenant
            ? api.get("/me/rentals", config)
            : Promise.resolve({ data: [] }),
        ]);

        if (
          !Array.isArray(requestResponse.data) ||
          !Array.isArray(rentalResponse.data)
        ) {
          throw new Error("Unexpected response");
        }

        if (controller.signal.aborted) return;

        const activeRentals = rentalResponse.data.filter(
          (rental) => rental.status === "ACTIVE"
        );

        setRequests(requestResponse.data);
        setRentals(activeRentals);
        setForm((previous) => ({
          ...previous,
          rentalId: activeRentals.some(
            (rental) => String(rental.id) === previous.rentalId
          )
            ? previous.rentalId
            : String(activeRentals[0]?.id ?? ""),
        }));
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setError(
          requestError.response?.status === 401
            ? "Your session ended. Please sign in again."
            : requestError.response?.status === 403
              ? "Your account cannot access maintenance requests."
              : "Could not load maintenance requests. Please refresh."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [isTenant, reload]);

  function showError(requestError, conflictMessage) {
    const status = requestError.response?.status;

    setError(
      status === 401
        ? "Your session ended. Please sign in again."
        : status === 403
          ? "You do not have permission to change this request."
          : status === 404
            ? "The rental or request was not found. Refresh the page."
            : status === 409
              ? conflictMessage
              : status === 400
                ? "Check the request details and try again."
                : "Could not confirm the change. Refresh before retrying."
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setNotice("");
  }

  async function submitRequest(event) {
    event.preventDefault();
    if (locked.current || loading) return;

    const title = form.title.trim();
    const description = form.description.trim();

    if (
      !title ||
      !description ||
      !rentals.some((rental) => String(rental.id) === form.rentalId)
    ) {
      setError("Choose an active rental and enter a title and description.");
      return;
    }

    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.post("/maintenance", {
        rentalId: Number(form.rentalId),
        title,
        description,
      });

      setForm((previous) => ({
        ...previous,
        title: "",
        description: "",
      }));
      setNotice("Maintenance request submitted. Your owner can review it.");
      setReload((value) => value + 1);
    } catch (requestError) {
      showError(
        requestError,
        "An unresolved request with this title may already exist, " +
          "or your rental may no longer be active."
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function updateStatus(request, status) {
    if (locked.current || loading) return;

    if (
      !window.confirm(
        `Mark "${request.title}" as ${statusLabels[status]}?`
      )
    ) {
      return;
    }

    locked.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.patch(`/maintenance/${request.id}/status`, { status });
      setNotice(`Request updated to ${statusLabels[status]}.`);
      setReload((value) => value + 1);
    } catch (requestError) {
      showError(
        requestError,
        "The request status has changed. Refresh before updating it."
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <section style={{ margin: "32px auto", maxWidth: "960px" }}>
      <p className="eyebrow">RENTAL SUPPORT</p>
      <h1>Maintenance requests</h1>
      <p>
        {isTenant
          ? "Report issues with your active rental and track their progress."
          : "Review tenant issues and update their progress."}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh requests
        </button>
        <Link to="/dashboard">Back to dashboard</Link>
      </div>

      {loading && <p role="status">Loading maintenance requests…</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {notice && (
        <p className="success-message" role="status">{notice}</p>
      )}

      {!loading && isTenant && rentals.length === 0 && !error && (
        <p>You need an active rental to submit a maintenance request.</p>
      )}

      {!loading && isTenant && rentals.length > 0 && (
        <form
          onSubmit={submitRequest}
          className="stack-form"
          style={{
            padding: "24px",
            background: "#fff",
            border: "1px solid #dbe7e2",
            borderRadius: "14px",
            marginBottom: "28px",
          }}
        >
          <h2>Report an issue</h2>

          <label htmlFor="maintenance-rental">
            Active rental
            <select
              id="maintenance-rental"
              name="rentalId"
              value={form.rentalId}
              onChange={handleChange}
              disabled={busy}
              required
            >
              {rentals.map((rental) => (
                <option key={rental.id} value={String(rental.id)}>
                  Rental #{rental.id} · Property #{rental.propertyId}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="maintenance-title">
            Issue title
            <input
              id="maintenance-title"
              name="title"
              placeholder="e.g. Kitchen tap is leaking"
              value={form.title}
              onChange={handleChange}
              maxLength={150}
              disabled={busy}
              required
            />
          </label>

          <label htmlFor="maintenance-description">
            Describe the issue
            <textarea
              id="maintenance-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={2000}
              rows={4}
              disabled={busy}
              required
            />
          </label>

          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Processing…" : "Submit maintenance request"}
          </button>
        </form>
      )}

      {!loading && (
        <>
          <h2>{isTenant ? "My reported issues" : "Issues for my properties"}</h2>

          {!error && requests.length === 0 && (
            <p>No maintenance requests yet.</p>
          )}

          <div style={{ display: "grid", gap: "16px" }}>
            {requests.map((request) => (
              <article
                key={request.id}
                style={{
                  padding: "24px",
                  border: "1px solid #dbe7e2",
                  borderRadius: "14px",
                  background: "#fff",
                  overflowWrap: "anywhere",
                }}
              >
                <p className="eyebrow">{request.propertyTitle}</p>
                <h3>{request.title}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {request.description}
                </p>
                <p>
                  Status:{" "}
                  <strong>{statusLabels[request.status] || request.status}</strong>
                </p>
                <p>
                  Request #{request.id} · Rental #{request.rentalId}
                </p>

                {!isTenant && request.status !== "RESOLVED" && (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || loading}
                    onClick={() =>
                      updateStatus(
                        request,
                        request.status === "OPEN"
                          ? "IN_PROGRESS"
                          : "RESOLVED"
                      )
                    }
                  >
                    {request.status === "OPEN"
                      ? "Start working"
                      : "Mark resolved"}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}