import { useEffect, useState } from "react";
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

export default function BrowseRooms() {
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [query, setQuery] = useState({ ...emptyFilters });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("low");

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
        }
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        if (requestError.response?.status === 400) {
          setError("Please check your search values.");
        } else {
          setError("We couldn’t load rooms. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProperties();

    return () => controller.abort();
  }, [query]);

  function updateFilter(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();

    setQuery({
      ...filters,
      locality: filters.locality.trim(),
    });
  }

  function handleReset() {
    setFilters({ ...emptyFilters });
    setQuery({ ...emptyFilters });
  }

  function roomTypeLabel(roomType) {
    if (roomType === "SINGLE") {
      return "Single room";
    }

    if (roomType === "SHARED") {
      return "Shared room";
    }

    return roomType;
  }

  const sortedProperties = [...properties].sort((first, second) => {
    if (sort === "low") {
      return Number(first.rent) - Number(second.rent);
    }

    return Number(second.rent) - Number(first.rent);
  });

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
            Find a room
            <span aria-hidden="true">↗</span>
          </a>
        </div>

        <aside className="hero-note">
          <span className="note-label">
            START WITH WHAT MATTERS
          </span>

          <h2>A place that works for you.</h2>

          <div className="note-item">
            <span aria-hidden="true">01</span>
            <div>
              <strong>Your budget</strong>
              <p>Filter by monthly rent.</p>
            </div>
          </div>

          <div className="note-item">
            <span aria-hidden="true">02</span>
            <div>
              <strong>Your neighborhood</strong>
              <p>Search your preferred locality.</p>
            </div>
          </div>

          <div className="note-item">
            <span aria-hidden="true">03</span>
            <div>
              <strong>Your everyday needs</strong>
              <p>Check room type and listed amenities.</p>
            </div>
          </div>
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

          <button
            className="primary"
            disabled={loading}
            type="submit"
          >
            {loading ? "Searching…" : "Search rooms"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
          >
            Clear
          </button>
        </form>

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
            {sortedProperties.map((property) => (
              <article className="property-card" key={property.id}>
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
              </article>
            ))}
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