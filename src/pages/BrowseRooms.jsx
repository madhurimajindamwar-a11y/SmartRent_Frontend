import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const emptyFilters = {
  locality: "",
  maxRent: "",
  roomType: "",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function roomTypeLabel(value) {
  if (value === "SINGLE") return "Single room";
  if (value === "SHARED") return "Shared room";
  return value || "Not listed";
}

function PropertyCover({ propertyId, title }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;

    async function loadCover() {
      setUrl("");
      setLoading(true);
      setFailed(false);

      try {
        const response = await api.get(
          `/properties/${propertyId}/images`,
          { signal: controller.signal }
        );

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected photo response");
        }

        if (controller.signal.aborted || response.data.length === 0) {
          return;
        }

        const cover = response.data[0];

        if (cover?.id == null) {
          throw new Error("Missing photo ID");
        }

        const image = await api.get(
          `/properties/${propertyId}/images/${cover.id}/content`,
          { responseType: "blob", signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(image.data);
        setUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadCover();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [propertyId]);

  return (
    <Link
      to={`/properties/${propertyId}`}
      aria-label={`View details for ${title}`}
      style={{
        display: "block",
        marginBottom: "16px",
        textDecoration: "none",
      }}
    >
      {url && !failed ? (
        <img
          src={url}
          alt={`${title} — cover photo`}
          onError={() => setFailed(true)}
          style={{
            display: "block",
            width: "100%",
            height: "210px",
            objectFit: "cover",
            borderRadius: "12px",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "210px",
            padding: "16px",
            boxSizing: "border-box",
            borderRadius: "12px",
            background: "#eef4f2",
            color: "#475569",
            textAlign: "center",
          }}
        >
          {loading
            ? "Loading photo…"
            : failed
              ? "Photo preview unavailable"
              : "No photo uploaded yet"}
        </div>
      )}
    </Link>
  );
}

export default function BrowseRooms() {
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [query, setQuery] = useState({ ...emptyFilters });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("low");
  const [selected, setSelected] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonNotice, setComparisonNotice] = useState("");
  const comparisonHeading = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProperties() {
      setLoading(true);
      setError("");

      const params = Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== "")
      );

      try {
        const response = await api.get("/properties/search", {
          params,
          signal: controller.signal,
        });

        if (!Array.isArray(response.data)) {
          throw new Error("Unexpected response");
        }

        if (!controller.signal.aborted) {
          setProperties(response.data);

          // Refresh selected details when they appear in new results.
          // Selections outside the current filters stay selected.
          setSelected((previous) =>
            previous.map(
              (item) =>
                response.data.find(
                  (property) => property.id === item.id
                ) || item
            )
          );
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setError(
          requestError.response?.status === 400
            ? "Please check your search values."
            : "We couldn’t load rooms. Please try again."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProperties();
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (showComparison) comparisonHeading.current?.focus();
  }, [showComparison]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setQuery({ ...filters, locality: filters.locality.trim() });
  }

  function handleReset() {
    setFilters({ ...emptyFilters });
    setQuery({ ...emptyFilters });
  }

  function toggleComparison(property) {
    const exists = selected.some((item) => item.id === property.id);

    if (exists) {
      removeSelection(property.id);
      return;
    }

    if (selected.length >= 3) {
      setComparisonNotice(
        "You can compare up to three rooms. Remove one to choose another."
      );
      return;
    }

    setSelected((previous) => [...previous, property]);
    setComparisonNotice(`${property.title} added to comparison.`);
  }

  function removeSelection(propertyId) {
    setSelected((previous) =>
      previous.filter((item) => item.id !== propertyId)
    );
    setComparisonNotice("Room removed from comparison.");
  }

  function clearComparison() {
    setSelected([]);
    setShowComparison(false);
    setComparisonNotice("Comparison cleared.");
  }

  const sortedProperties = [...properties].sort((first, second) =>
    sort === "low"
      ? Number(first.rent) - Number(second.rent)
      : Number(second.rent) - Number(first.rent)
  );

  const comparisonRows = [
    ["Monthly rent", (property) => currency.format(property.rent)],
    ["Locality", (property) => property.locality || "Not listed"],
    ["Room type", (property) => roomTypeLabel(property.roomType)],
    ["Wi-Fi", (property) => (property.wifi ? "Yes" : "No")],
    ["Food", (property) => (property.food ? "Yes" : "No")],
    ["AC", (property) => (property.ac ? "Yes" : "No")],
    [
      "Availability",
      (property) => (property.available ? "Available" : "Unavailable"),
    ],
    [
      "Admin review",
      (property) =>
        property.verificationStatus === "VERIFIED"
          ? "Approved"
          : property.verificationStatus,
    ],
    [
      "Description",
      (property) => property.description || "No description provided.",
    ],
  ];

  const cellStyle = {
    padding: "16px",
    borderBottom: "1px solid #e2e8f0",
    textAlign: "left",
    verticalAlign: "top",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
  };

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A BETTER PLACE TO BEGIN</p>
          <h1>
            Your next room.
            <br />
            <span>Within reach.</span>
          </h1>
          <p className="hero-description">
            Find a room that fits your budget and everyday needs.
            Compare the essentials, save your favorites, and connect
            with an owner through a rental request.
          </p>
          <a className="button primary" href="#room-search">
            Find a room <span aria-hidden="true">↗</span>
          </a>
        </div>

        <aside className="hero-note">
          <span className="note-label">START WITH WHAT MATTERS</span>
          <h2>A place that works for you.</h2>

          {[
            ["01", "Your budget", "Filter by monthly rent."],
            ["02", "Your neighborhood", "Search your preferred locality."],
            ["03", "Your everyday needs", "Compare room types and amenities."],
          ].map(([number, title, description]) => (
            <div className="note-item" key={number}>
              <span aria-hidden="true">{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </div>
          ))}
        </aside>
      </section>

      <section id="room-search" className="browse-section">
        <div className="section-intro">
          <p className="eyebrow">EXPLORE YOUR OPTIONS</p>
          <h2>Find your kind of room</h2>
          <p>Start with a locality and a monthly budget.</p>
        </div>

        <form className="search-panel" onSubmit={handleSearch}>
          <label htmlFor="search-locality">
            Locality
            <input
              id="search-locality"
              name="locality"
              placeholder="e.g. Uppal"
              value={filters.locality}
              onChange={updateFilter}
              maxLength={100}
            />
          </label>

          <label htmlFor="search-max-rent">
            Maximum rent / month
            <input
              id="search-max-rent"
              name="maxRent"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 8000"
              value={filters.maxRent}
              onChange={updateFilter}
            />
          </label>

          <label htmlFor="search-room-type">
            Room type
            <select
              id="search-room-type"
              name="roomType"
              value={filters.roomType}
              onChange={updateFilter}
            >
              <option value="">All room types</option>
              <option value="SINGLE">Single room</option>
              <option value="SHARED">Shared room</option>
            </select>
          </label>

          <button className="primary" disabled={loading} type="submit">
            {loading ? "Searching…" : "Search rooms"}
          </button>

          <button type="button" onClick={handleReset} disabled={loading}>
            Clear
          </button>
        </form>

        <section
          aria-label="Room comparison selections"
          style={{
            marginTop: "24px",
            padding: "20px",
            border: "1px solid #dbe7e2",
            borderRadius: "14px",
            background: "#f0f7f3",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Compare rooms</h3>
          <p>Select two or three rooms to compare their details.</p>

          <p role="status">
            {comparisonNotice || `${selected.length} of 3 rooms selected.`}
          </p>

          {selected.length > 0 && (
            <ul style={{ paddingLeft: "20px" }}>
              {selected.map((property) => (
                <li key={property.id} style={{ marginBottom: "10px" }}>
                  <span style={{ overflowWrap: "anywhere" }}>
                    {property.title}
                  </span>{" "}
                  <button
                    type="button"
                    onClick={() => removeSelection(property.id)}
                    aria-label={`Remove ${property.title} from comparison`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              className="primary"
              disabled={selected.length < 2 || loading}
              onClick={() => {
                setShowComparison(true);
                setComparisonNotice("");
              }}
            >
              Compare selected rooms ({selected.length})
            </button>

            {selected.length > 0 && (
              <button type="button" onClick={clearComparison}>
                Clear comparison
              </button>
            )}
          </div>

          {showComparison && selected.length >= 2 && (
            <div style={{ marginTop: "24px", minWidth: 0 }}>
              <h3 ref={comparisonHeading} tabIndex={-1}>
                Room comparison
              </h3>
              <p>
                Selections remain when you change search filters.
                Confirm current availability on the room details page.
              </p>

              <div
                role="region"
                aria-label="Room comparison table; scroll horizontally on small screens"
                tabIndex={0}
                style={{ overflowX: "auto", maxWidth: "100%" }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: selected.length === 3 ? "760px" : "560px",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                    background: "#fff",
                  }}
                >
                  <caption
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Comparing {selected.length} selected rooms
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" style={cellStyle}>Feature</th>
                      {selected.map((property) => (
                        <th
                          key={property.id}
                          scope="col"
                          style={{ ...cellStyle, background: "#e7f0eb" }}
                        >
                          <Link to={`/properties/${property.id}`}>
                            {property.title}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map(([label, value]) => (
                      <tr key={label}>
                        <th scope="row" style={cellStyle}>{label}</th>
                        {selected.map((property) => (
                          <td key={property.id} style={cellStyle}>
                            {value(property)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => setShowComparison(false)}
                style={{ marginTop: "16px" }}
              >
                Hide comparison
              </button>
            </div>
          )}
        </section>

        <div className="results-bar">
          <p aria-live="polite">
            {loading
              ? "Finding rooms…"
              : error
                ? "Search unavailable"
                : `${properties.length} available ${
                    properties.length === 1 ? "room" : "rooms"
                  }`}
          </p>

          <label className="sort-control" htmlFor="room-sort">
            Sort by
            <select
              id="room-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="low">Rent: low to high</option>
              <option value="high">Rent: high to low</option>
            </select>
          </label>
        </div>

        {loading && (
          <div className="state-panel" role="status">
            Loading available rooms…
          </div>
        )}

        {!loading && error && (
          <div className="state-panel" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setQuery({ ...query })}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className="state-panel">
            <h3>No rooms match these filters yet</h3>
            <p>
              Try another locality or clear your filters to see
              available rooms.
            </p>
            <button type="button" onClick={handleReset}>
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <div className="property-grid">
            {sortedProperties.map((property) => {
              const isSelected = selected.some(
                (item) => item.id === property.id
              );

              return (
                <article className="property-card" key={property.id}>
                  <PropertyCover
                    propertyId={property.id}
                    title={property.title}
                  />

                  <div className="card-top">
                    <span className="room-type">
                      {roomTypeLabel(property.roomType)}
                    </span>
                    {property.verificationStatus === "VERIFIED" && (
                      <span className="badge">Admin reviewed</span>
                    )}
                  </div>

                  <p className="location">{property.locality}</p>
                  <h3>{property.title}</h3>
                  <p className="description">
                    {property.description || "No description provided."}
                  </p>

                  <div className="amenities">
                    {property.wifi && <span>Wi-Fi</span>}
                    {property.food && <span>Food</span>}
                    {property.ac && <span>AC</span>}
                    {!property.wifi && !property.food && !property.ac && (
                      <span>Amenities not listed</span>
                    )}
                  </div>

                  <div className="card-bottom">
                    <p className="price">
                      {currency.format(property.rent)}
                      <small> / month</small>
                    </p>
                    <span className="available">Available</span>
                  </div>

                  <Link
                    className="button card-link"
                    to={`/properties/${property.id}`}
                    aria-label={`View details for ${property.title}`}
                  >
                    View room details →
                  </Link>

                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={
                      isSelected
                        ? `Remove ${property.title} from comparison`
                        : `Add ${property.title} to comparison`
                    }
                    disabled={!isSelected && selected.length >= 3}
                    onClick={() => toggleComparison(property)}
                    style={{
                      width: "100%",
                      marginTop: "12px",
                      border: isSelected
                        ? "2px solid #166552"
                        : "1px solid #cbd5e1",
                      background: isSelected ? "#e7f0eb" : "#fff",
                      color: "#166552",
                    }}
                  >
                    {isSelected ? "✓ Selected for comparison" : "Add to compare"}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <p className="listing-note">
          “Admin reviewed” indicates approval in SmartRent. It does
          not guarantee a physical inspection. Confirm the deposit,
          extra charges, and room condition with the owner before
          committing.
        </p>
      </section>
    </>
  );
}
