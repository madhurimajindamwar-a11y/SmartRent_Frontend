import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const busyRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;

    async function loadNotifications() {
      if (fetching || busyRef.current) return;

      fetching = true;

      try {
        const response = await api.get("/notifications", {
          signal: controller.signal,
        });

        if (
          !Array.isArray(response.data?.notifications) ||
          !Number.isFinite(response.data?.unreadCount)
        ) {
          throw new Error("Unexpected notification response");
        }

        if (controller.signal.aborted) return;

        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
        setError("");
      } catch (requestError) {
        if (controller.signal.aborted) return;

        if (requestError.response?.status === 401) {
          setError("Your session ended. Please sign in again.");
        } else {
          setError("Could not load notifications. Please refresh.");
        }
      } finally {
        fetching = false;

        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }, 30000);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [reload]);

  function refresh() {
    if (busyRef.current) return;

    setLoading(true);
    setError("");
    setReload((value) => value + 1);
  }

  async function markRead(id) {
    if (busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await api.patch(
        id === null
          ? "/notifications/read-all"
          : `/notifications/${id}/read`
      );

      setNotice(
        id === null
          ? "All notifications marked as read."
          : "Notification marked as read."
      );
      setLoading(true);
      setReload((value) => value + 1);
    } catch (requestError) {
      const status = requestError.response?.status;

      if (status === 401) {
        setError("Your session ended. Please sign in again.");
      } else if (status === 404) {
        setError("Notification not found. Refresh the list.");
      } else {
        setError(
          "Could not confirm the change. Refresh before retrying."
        );
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const buttonStyle = {
    minHeight: "42px",
    padding: "10px 16px",
    borderRadius: "8px",
  };

  return (
    <section
      style={{
        maxWidth: "900px",
        margin: "32px auto",
        padding: "0 8px",
      }}
    >
      <Link to="/dashboard">← Back to dashboard</Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          margin: "24px 0",
        }}
      >
        <div>
          <p className="eyebrow">YOUR UPDATES</p>
          <h1 style={{ margin: "8px 0" }}>Notifications</h1>

          <p>
            Rental requests, decisions, and maintenance updates.
          </p>

          {!loading && (
            <p role="status">
              <strong>{unreadCount}</strong>{" "}
              {unreadCount === 1
                ? "unread notification"
                : "unread notifications"}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={loading || busy}
            onClick={refresh}
            style={buttonStyle}
          >
            Refresh
          </button>

          <button
            type="button"
            disabled={loading || busy || unreadCount === 0}
            onClick={() => markRead(null)}
            style={buttonStyle}
          >
            {busy ? "Updating…" : "Mark all as read"}
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" style={{ color: "#15803d" }}>
          {notice}
        </p>
      )}

      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}

      {loading && <p role="status">Loading notifications…</p>}

      {!loading && !error && notifications.length === 0 && (
        <div
          style={{
            padding: "32px",
            border: "1px solid #dbe3ef",
            borderRadius: "16px",
            background: "#f8fafc",
          }}
        >
          <h2>You’re all caught up</h2>
          <p>
            New rental and maintenance updates will appear here.
          </p>
          <Link to="/dashboard">Go to your dashboard →</Link>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <>
          <div style={{ display: "grid", gap: "16px" }}>
            {notifications.map((notification) => {
              const target =
                notification.targetPath === "/maintenance"
                  ? "/maintenance"
                  : "/dashboard";

              return (
                <article
                  key={notification.id}
                  style={{
                    padding: "22px",
                    border: notification.read
                      ? "1px solid #dbe3ef"
                      : "1px solid #91c8b8",
                    borderLeft: notification.read
                      ? "4px solid #dbe3ef"
                      : "4px solid #126b59",
                    borderRadius: "12px",
                    background: notification.read
                      ? "#fff"
                      : "#f0f9f5",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "19px",
                        margin: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {notification.title}
                    </h2>

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: notification.read
                          ? "#64748b"
                          : "#126b59",
                      }}
                    >
                      {notification.read ? "Read" : "New"}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "12px 0",
                      lineHeight: 1.6,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {notification.message}
                  </p>

                  <p
                    style={{
                      margin: "10px 0",
                      color: "#64748b",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    <time dateTime={notification.createdAt}>
                      {formatDate(notification.createdAt)}
                    </time>
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginTop: "16px",
                    }}
                  >
                    <Link to={target}>
                      {target === "/maintenance"
                        ? "View maintenance →"
                        : "View dashboard →"}
                    </Link>

                    {!notification.read && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => markRead(notification.id)}
                        style={buttonStyle}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p
            style={{
              marginTop: "20px",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            Showing the latest 50 notifications at most. Updates
            refresh automatically while this page is open.
          </p>
        </>
      )}
    </section>
  );
}
