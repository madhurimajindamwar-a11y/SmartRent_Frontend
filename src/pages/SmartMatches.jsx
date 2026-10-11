import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const AMENITIES = [
  { name: "wifi", label: "Wi-Fi" },
  { name: "food", label: "Food service" },
  { name: "ac", label: "Air conditioning" },
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function SmartMatches() {
  const [preferences, setPreferences] = useState({
    maxRent: "",
    locality: "",
    roomType: "",
    wifi: false,
    food: false,
    ac: false,
  });

  const [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(null);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  function updatePreference(event) {
    const { name, type, checked, value } = event.target;

    setPreferences((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSearched(false);
    setMatches([]);
  }

  async function findMatches(event) {
    event.preventDefault();

    if (requestRef.current) return;

    const locality = preferences.locality.trim();
    const hasBudget = preferences.maxRent !== "";

    if (
      !hasBudget &&
      !locality &&
      !preferences.roomType &&
      !preferences.wifi &&
      !preferences.food &&
      !preferences.ac
    ) {
      setError("Choose at least one preference to find matching rooms.");
      return;
    }

    const maxRent = hasBudget ? Number(preferences.maxRent) : null;

    if (
      hasBudget &&
      (!Number.isFinite(maxRent) ||
        maxRent <= 0 ||
        maxRent > 99999999.99)
    ) {
      setError("Enter a valid maximum monthly rent greater than zero.");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    setBusy(true);
    setError("");
    setMatches([]);
    setSearched(false);

    try {
      const response = await api.post(
        "/matches",
        {
          maxRent,
          locality: locality || null,
          roomType: preferences.roomType || null,
          wifi: preferences.wifi ? true : null,
          food: preferences.food ? true : null,
          ac: preferences.ac ? true : null,
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

      const validResponse =
        Array.isArray(response.data) &&
        response.data.every(
          (match) =>
            match?.property?.id != null &&
            Number.isInteger(match.matchScore) &&
            match.matchScore >= 0 &&
            match.matchScore <= 100 &&
            Array.isArray(match.reasons) &&
            match.reasons.every((reason) => typeof reason === "string")
        );

      if (!validResponse) {
        throw new Error("Unexpected matching response");
      }

      setMatches(response.data);
      setSearched(true);
    } catch (requestError) {
      if (controller.signal.aborted) return;

      const status = requestError.response?.status;

      if (status === 401) {
        setError("Your session ended. Please sign in again.");
      } else if (status === 403) {
        setError("Sign in with a tenant account to use Smart matches.");
      } else if (status === 400) {
        setError(
          "Check your preferences. Maximum rent must be greater than zero."
        );
      } else {
        setError("We couldn’t find matches. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section className="smart-matches-page">
      <style>{`
        .smart-matches-page {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 32px 20px 48px;
          box-sizing: border-box;
        }

        .smart-matches-back {
          display: inline-block;
          margin-bottom: 24px;
          color: #166653;
          font-weight: 600;
          text-decoration: none;
        }

        .smart-matches-back:hover {
          text-decoration: underline;
        }

        .smart-matches-heading {
          margin-bottom: 28px;
        }

        .smart-matches-heading h1 {
          margin: 8px 0 12px;
          font-size: clamp(1.8rem, 4vw, 2.7rem);
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .smart-matches-heading > p:last-child {
          margin: 0;
          color: #526477;
          line-height: 1.7;
        }

        .smart-matches-eyebrow {
          margin: 0;
          color: #166653;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .smart-matches-form {
          padding: 28px;
          border: 1px solid #dbe5e1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 8px 28px rgba(24, 53, 44, 0.04);
        }

        .smart-matches-fields {
          min-width: 0;
          margin: 0;
          padding: 0;
          border: 0;
        }

        .smart-matches-fields > legend {
          margin-bottom: 22px;
          padding: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .smart-matches-input-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .smart-matches-field {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 9px;
          font-weight: 600;
        }

        .smart-matches-field input,
        .smart-matches-field select {
          width: 100%;
          min-height: 48px;
          margin: 0;
          padding: 12px 14px;
          box-sizing: border-box;
          border: 1px solid #bdcec7;
          border-radius: 9px;
          background: #ffffff;
          color: #18352c;
          font: inherit;
          font-weight: 400;
        }

        .smart-matches-field input:focus-visible,
        .smart-matches-field select:focus-visible {
          outline: 2px solid #16705b;
          outline-offset: 2px;
        }

        .smart-matches-amenities {
          min-width: 0;
          margin: 26px 0 0;
          padding: 0;
          border: 0;
        }

        .smart-matches-amenities > legend {
          margin-bottom: 12px;
          padding: 0;
          font-weight: 600;
        }

        .smart-matches-amenity-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .smart-matches-page .smart-matches-amenity {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 52px;
          margin: 0;
          padding: 12px 16px;
          box-sizing: border-box;
          border: 1px solid #d2ddd8;
          border-radius: 10px;
          background: #ffffff;
          font-weight: 500;
          cursor: pointer;
        }

        .smart-matches-amenity.is-selected {
          border-color: #16705b;
          background: #edf8f3;
        }

        .smart-matches-page
        .smart-matches-amenity input[type="checkbox"] {
          position: static;
          display: block;
          appearance: auto;
          width: 20px;
          height: 20px;
          min-width: 20px;
          min-height: 20px;
          max-width: 20px;
          margin: 0;
          padding: 0;
          flex: 0 0 20px;
          opacity: 1;
          pointer-events: auto;
          accent-color: #16705b;
          cursor: pointer;
        }

        .smart-matches-amenity:focus-within {
          outline: 2px solid #16705b;
          outline-offset: 3px;
        }

        .smart-matches-page .smart-matches-help {
          position: static;
          display: block;
          clear: both;
          margin: 18px 0 0;
          padding: 0;
          color: #526477;
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .smart-matches-actions {
          margin-top: 24px;
          padding-top: 22px;
          border-top: 1px solid #e6ece9;
        }

        .smart-matches-submit {
          min-height: 48px;
          padding: 13px 24px;
          border: 0;
          border-radius: 10px;
          background: #166653;
          color: #ffffff;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        .smart-matches-submit:hover:not(:disabled) {
          background: #104f40;
        }

        .smart-matches-submit:focus-visible {
          outline: 2px solid #166653;
          outline-offset: 3px;
        }

        .smart-matches-submit:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .smart-matches-feedback {
          margin: 20px 0 0;
          padding: 16px 18px;
          border-radius: 10px;
          background: #f0f5f3;
          line-height: 1.6;
        }

        .smart-matches-feedback.is-error {
          background: #fff1f2;
          color: #b91c1c;
        }

        .smart-matches-results {
          margin-top: 36px;
        }

        .smart-matches-results h2 {
          margin: 0 0 8px;
          font-size: 1.4rem;
        }

        .smart-matches-results-intro {
          margin: 0 0 22px;
          color: #526477;
          line-height: 1.6;
        }

        .smart-matches-result-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }

        .smart-matches-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          padding: 24px;
          border: 1px solid #dbe5e1;
          border-radius: 16px;
          background: #ffffff;
        }

        .smart-matches-score {
          align-self: flex-start;
          margin: 0 0 18px;
          padding: 7px 12px;
          border-radius: 999px;
          background: #edf8f3;
          color: #166653;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .smart-matches-card h3 {
          margin: 0 0 10px;
          font-size: 1.25rem;
          overflow-wrap: anywhere;
        }

        .smart-matches-location {
          margin: 0 0 12px;
          color: #526477;
        }

        .smart-matches-rent {
          margin: 0 0 16px;
          font-size: 1.2rem;
          font-weight: 700;
        }

        .smart-matches-rent span {
          color: #526477;
          font-size: 0.9rem;
          font-weight: 400;
        }

        .smart-matches-description {
          margin: 0 0 18px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .smart-matches-reasons {
          margin: 0 0 24px;
          padding-left: 20px;
          color: #526477;
          line-height: 1.7;
        }

        .smart-matches-details {
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid #e6ece9;
          color: #166653;
          font-weight: 600;
          text-decoration: none;
        }

        .smart-matches-details:hover {
          text-decoration: underline;
        }

        @media (max-width: 760px) {
          .smart-matches-input-grid {
            grid-template-columns: 1fr;
          }

          .smart-matches-amenity-grid {
            grid-template-columns: 1fr;
          }

          .smart-matches-form {
            padding: 22px;
          }
        }

        @media (max-width: 480px) {
          .smart-matches-page {
            padding: 24px 16px 36px;
          }

          .smart-matches-form {
            padding: 18px;
          }

          .smart-matches-submit {
            width: 100%;
          }

          .smart-matches-result-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Link to="/dashboard" className="smart-matches-back">
        ← My dashboard
      </Link>

      <header className="smart-matches-heading">
        <p className="smart-matches-eyebrow">Personalized room search</p>
        <h1>Find your room match</h1>
        <p>
          Tell us what matters to you. Compare available rooms ranked
          by how closely they match your preferences.
        </p>
      </header>

      <form onSubmit={findMatches} className="smart-matches-form">
        <fieldset className="smart-matches-fields" disabled={busy}>
          <legend>Your preferences</legend>

          <div className="smart-matches-input-grid">
            <label
              className="smart-matches-field"
              htmlFor="match-max-rent"
            >
              Maximum monthly rent
              <input
                id="match-max-rent"
                name="maxRent"
                type="number"
                min="0.01"
                max="99999999.99"
                step="0.01"
                placeholder="For example, 8000"
                value={preferences.maxRent}
                onChange={updatePreference}
              />
            </label>

            <label
              className="smart-matches-field"
              htmlFor="match-locality"
            >
              Preferred locality
              <input
                id="match-locality"
                name="locality"
                type="text"
                maxLength={100}
                placeholder="For example, Uppal"
                value={preferences.locality}
                onChange={updatePreference}
              />
            </label>

            <label
              className="smart-matches-field"
              htmlFor="match-room-type"
            >
              Preferred room type
              <select
                id="match-room-type"
                name="roomType"
                value={preferences.roomType}
                onChange={updatePreference}
              >
                <option value="">No preference</option>
                <option value="SINGLE">Single room</option>
                <option value="SHARED">Shared room</option>
              </select>
            </label>
          </div>

          <fieldset className="smart-matches-amenities">
            <legend>Preferred amenities</legend>

            <div className="smart-matches-amenity-grid">
              {AMENITIES.map(({ name, label }) => (
                <label
                  key={name}
                  htmlFor={`match-${name}`}
                  className={`smart-matches-amenity ${
                    preferences[name] ? "is-selected" : ""
                  }`}
                >
                  <input
                    id={`match-${name}`}
                    name={name}
                    type="checkbox"
                    checked={preferences[name]}
                    onChange={updatePreference}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="smart-matches-help">
            Rooms above your budget are excluded. Locality, room type
            and amenities affect your match score. Leave an amenity
            unchecked if you have no preference.
          </p>
        </fieldset>

        <div className="smart-matches-actions">
          <button
            type="submit"
            className="smart-matches-submit"
            disabled={busy}
          >
            {busy ? "Finding your matches…" : "Find my matches"}
          </button>
        </div>
      </form>

      {error && (
        <p
          className="smart-matches-feedback is-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {busy && (
        <p className="smart-matches-feedback" role="status">
          Comparing available rooms with your preferences…
        </p>
      )}

      {searched && matches.length === 0 && (
        <p className="smart-matches-feedback" role="status">
          No available rooms were found
          {preferences.maxRent !== "" ? " within your budget" : ""}.
          Try increasing your budget or leaving it blank.
        </p>
      )}

      {searched && matches.length > 0 && (
        <section
          className="smart-matches-results"
          aria-labelledby="match-results-heading"
        >
          <h2 id="match-results-heading">Your room matches</h2>

          <p className="smart-matches-results-intro" role="status">
            {matches.length} available{" "}
            {matches.length === 1 ? "room" : "rooms"}, ranked by
            preference match.
          </p>

          <div className="smart-matches-result-grid">
            {matches.map(({ property, matchScore, reasons }) => (
              <article
                key={property.id}
                className="smart-matches-card"
              >
                <p className="smart-matches-score">
                  {matchScore}% preference match
                </p>

                <h3>{property.title}</h3>

                <p className="smart-matches-location">
                  {property.locality} ·{" "}
                  {property.roomType === "SINGLE"
                    ? "Single room"
                    : property.roomType === "SHARED"
                      ? "Shared room"
                      : property.roomType}
                </p>

                <p className="smart-matches-rent">
                  {currency.format(Number(property.rent))}
                  <span> / month</span>
                </p>

                {property.description && (
                  <p className="smart-matches-description">
                    {property.description}
                  </p>
                )}

                <ul className="smart-matches-reasons">
                  {reasons.map((reason, index) => (
                    <li key={`${property.id}-${index}`}>
                      {reason}
                    </li>
                  ))}
                </ul>

                <Link
                  to={`/properties/${property.id}`}
                  className="smart-matches-details"
                >
                  View photos and room details →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}