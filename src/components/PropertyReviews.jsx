import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function Stars({ rating }) {
  const rounded = Math.round(Number(rating) || 0);

  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      style={{ color: "#b45309", letterSpacing: "2px" }}
    >
      {"★".repeat(rounded)}
      {"☆".repeat(5 - rounded)}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export default function PropertyReviews({ propertyId, session }) {
  const tenantId =
    session?.user?.role === "TENANT" ? session.user.id : null;

  const [summary, setSummary] = useState({
    averageRating: 0,
    reviewCount: 0,
    reviews: [],
  });
  const [mine, setMine] = useState(null);
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [eligibilityError, setEligibilityError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  const savingRef = useRef(false);
 const contextKey = `${propertyId}:${tenantId ?? "visitor"}`;
const contextRef = useRef(contextKey);

useEffect(() => {
  contextRef.current = contextKey;

  return () => {
    contextRef.current = null;
  };
}, [contextKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReviews() {
      setLoading(true);
      setError("");
      setEligibilityError("");
      setFormError("");
      setMine(null);
      setEditing(false);
      setRating("");
      setComment("");

      try {
        const response = await api.get(
          `/properties/${propertyId}/reviews`,
          { signal: controller.signal }
        );

        if (
          !Array.isArray(response.data?.reviews) ||
          !Number.isFinite(response.data?.averageRating) ||
          !Number.isFinite(response.data?.reviewCount)
        ) {
          throw new Error("Unexpected review response");
        }

        if (controller.signal.aborted) return;

        setSummary(response.data);

        if (tenantId !== null) {
          try {
            const mineResponse = await api.get(
              `/reviews/properties/${propertyId}/mine`,
              { signal: controller.signal }
            );

            if (
              typeof mineResponse.data?.canReview !== "boolean"
            ) {
              throw new Error("Unexpected eligibility response");
            }

            if (controller.signal.aborted) return;

            setMine(mineResponse.data);
          } catch {
            if (controller.signal.aborted) return;

            setEligibilityError(
              "Could not check review eligibility. Refresh to retry."
            );
          }
        }
      } catch {
        if (controller.signal.aborted) return;

        setError("Could not load reviews. Please refresh.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => controller.abort();
  }, [propertyId, tenantId, reload]);

  function startEditing() {
    setRating(
      mine?.review ? String(mine.review.rating) : ""
    );
    setComment(mine?.review?.comment || "");
    setFormError("");
    setNotice("");
    setEditing(true);
  }

  async function saveReview(event) {
    event.preventDefault();

    if (savingRef.current || !mine?.canReview) return;

    const selectedRating = Number(rating);
    const trimmedComment = comment.trim();

    if (
      !Number.isInteger(selectedRating) ||
      selectedRating < 1 ||
      selectedRating > 5
    ) {
      setFormError("Choose a rating from 1 to 5.");
      return;
    }

    if (!trimmedComment || trimmedComment.length > 1000) {
      setFormError("Write a review between 1 and 1000 characters.");
      return;
    }

    const submittedContext = contextKey;

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    setNotice("");

    try {
      await api.put(`/reviews/properties/${propertyId}`, {
        rating: selectedRating,
        comment: trimmedComment,
      });

      if (contextRef.current !== submittedContext) return;

      setNotice(
        mine.review
          ? "Your review was updated successfully."
          : "Thank you. Your review was published."
      );
      setEditing(false);
      setReload((value) => value + 1);
    } catch (requestError) {
      if (contextRef.current !== submittedContext) return;

      const status = requestError.response?.status;

      if (status === 401) {
        setFormError("Your session ended. Please sign in again.");
      } else if (status === 403) {
        setFormError(
          "You can review only a property you have rented."
        );
      } else if (status === 400) {
        setFormError("Check your rating and review text.");
      } else if (status === 404) {
        setFormError("This listing is unavailable for review.");
      } else {
        setFormError(
          "Could not confirm your review. Refresh before retrying."
        );
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const buttonStyle = {
    minHeight: "42px",
    padding: "10px 16px",
    borderRadius: "8px",
  };

  return (
    <section className="details-section" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading">Tenant ratings and reviews</h2>

      <p className="field-help">
        Reviews are written by tenants with rental records for this
        property.
      </p>

      {notice && <p role="status">{notice}</p>}

      {loading && <p role="status">Loading reviews…</p>}

      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            style={buttonStyle}
          >
            Refresh reviews
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {summary.reviewCount > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                padding: "16px",
                background: "#fff7ed",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <strong style={{ fontSize: "28px" }}>
                {summary.averageRating.toFixed(1)}
                <span style={{ fontSize: "15px" }}> / 5</span>
              </strong>

              <Stars rating={summary.averageRating.toFixed(1)} />

              <span>
                {summary.reviewCount}{" "}
                {summary.reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : (
            <p>No reviews yet. Rental tenants can share their experience.</p>
          )}

          {!session && (
            <p>
              <Link to="/login">Sign in</Link> to check whether you
              can review this property.
            </p>
          )}

          {tenantId !== null && eligibilityError && (
            <div role="alert">
              <p>{eligibilityError}</p>
              <button
                type="button"
                disabled={saving}
                onClick={() => setReload((value) => value + 1)}
                style={buttonStyle}
              >
                Refresh
              </button>
            </div>
          )}

          {tenantId !== null && mine && !mine.canReview && (
            <p className="field-help">
              You can write a review after renting this property.
              Sending a rental request alone does not qualify.
            </p>
          )}

          {mine?.canReview && !editing && (
            <button
              type="button"
              disabled={saving}
              onClick={startEditing}
              style={{ ...buttonStyle, marginBottom: "20px" }}
            >
              {mine.review ? "Edit my review" : "Write a review"}
            </button>
          )}

          {mine?.canReview && editing && (
            <form onSubmit={saveReview} style={{ marginBottom: "24px" }}>
              <fieldset
                disabled={saving}
                style={{
                  border: "1px solid #dbe3ef",
                  borderRadius: "12px",
                  padding: "20px",
                  minWidth: 0,
                }}
              >
                <legend>
                  {mine.review ? "Edit your review" : "Your experience"}
                </legend>

                <label htmlFor={`review-rating-${propertyId}`}>
                  Rating
                </label>

                <select
                  id={`review-rating-${propertyId}`}
                  value={rating}
                  onChange={(event) => {
                    setRating(event.target.value);
                    setFormError("");
                  }}
                  required
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px",
                    margin: "8px 0 16px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    background: "#fff",
                  }}
                >
                  <option value="">Choose a rating</option>
                  <option value="5">5 — Excellent</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Average</option>
                  <option value="2">2 — Below expectations</option>
                  <option value="1">1 — Poor</option>
                </select>

                <label htmlFor={`review-comment-${propertyId}`}>
                  Describe your experience
                </label>

                <textarea
                  id={`review-comment-${propertyId}`}
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    setFormError("");
                  }}
                  rows={4}
                  maxLength={1000}
                  required
                  aria-describedby={`review-help-${propertyId}`}
                  placeholder="Share your experience with the room, amenities, and owner."
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    marginTop: "8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    resize: "vertical",
                  }}
                />

                <p
                  id={`review-help-${propertyId}`}
                  className="field-help"
                >
                  {comment.length} / 1000 characters. Avoid sharing
                  phone numbers or other personal information.
                </p>

                {formError && (
                  <p role="alert" className="error-text">
                    {formError}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="submit"
                    className="primary"
                    style={buttonStyle}
                  >
                    {saving
                      ? "Saving…"
                      : mine.review
                        ? "Update review"
                        : "Publish review"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFormError("");
                    }}
                    style={buttonStyle}
                  >
                    Cancel
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          <div style={{ display: "grid", gap: "16px" }}>
            {summary.reviews.map((review) => (
              <article
                key={review.id}
                style={{
                  padding: "20px",
                  border: "1px solid #dbe3ef",
                  borderRadius: "12px",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{review.reviewerName}</strong>
                  <Stars rating={review.rating} />
                </div>

                <p className="field-help">
                  Rental tenant · {formatDate(review.updatedAt)}
                </p>

                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    marginBottom: 0,
                  }}
                >
                  {review.comment}
                </p>
              </article>
            ))}
          </div>

          {summary.reviewCount > summary.reviews.length && (
            <p className="field-help">
              Showing the latest {summary.reviews.length} reviews.
              The average includes all reviews.
            </p>
          )}
        </>
      )}
    </section>
  );
}