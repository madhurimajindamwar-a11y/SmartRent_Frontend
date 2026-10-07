import { useEffect, useRef, useState } from "react";
import api from "./services/api";
import "./App.css";

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

export default function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activeRequest = useRef(null);

  async function loadProperties(selectedFilters) {
    activeRequest.current?.abort();

    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError("");

    const params = {};

    for (const [key, value] of Object.entries(selectedFilters)) {
      if (value.trim() !== "") {
        params[key] = value.trim();
      }
    }

    try {
      const response = await api.get("/properties/search", {
        params,
        signal: controller.signal,
      });

      if (!Array.isArray(response.data)) {
        throw new Error("Unexpected API response");
      }

      if (!controller.signal.aborted) {
        setProperties(response.data);
      }
    } catch (requestError) {
      if (controller.signal.aborted) return;

      setProperties([]);

      if (requestError.response?.status === 400) {
        setError("Please check your search filters and try again.");
      } else {
        setError(
          "Could not load properties. Check that the backend is running on port 8081."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadProperties(emptyFilters);

    return () => activeRequest.current?.abort();
  }, []);

  function updateFilter(event) {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();
    loadProperties(filters);
  }

  function handleReset() {
    setFilters({ ...emptyFilters });
    loadProperties(emptyFilters);
  }

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href="/">
          Smart<span>Rent</span>
        </a>
        <span className="header-note">Find your next room</span>
      </header>

      <main className="page">
        <section className="page-heading">
          <p className="eyebrow">ROOMS FOR STUDENTS & PROFESSIONALS</p>
          <h1>A place that fits your life.</h1>
          <p>Explore verified rooms by location, budget, and room type.</p>
        </section>

        <form className="search-panel" onSubmit={handleSearch}>
          <div className="field">
            <label htmlFor="locality">Locality</label>
            <input
              id="locality"
              name="locality"
              value={filters.locality}
              onChange={updateFilter}
              placeholder="e.g. Uppal"
              maxLength={100}
            />
          </div>

          <div className="field">
            <label htmlFor="maxRent">Maximum monthly rent</label>
            <input
              id="maxRent"
              name="maxRent"
              type="number"
              min="0"
              step="0.01"
              value={filters.maxRent}
              onChange={updateFilter}
              placeholder="e.g. 8000"
            />
          </div>

          <div className="field">
            <label htmlFor="roomType">Room type</label>
            <select
              id="roomType"
              name="roomType"
              value={filters.roomType}
              onChange={updateFilter}
            >
              <option value="">All room types</option>
              <option value="SINGLE">Single</option>
              <option value="SHARED">Shared</option>
            </select>
          </div>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search rooms"}
          </button>

          <button
            className="reset-button"
            type="button"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </button>
        </form>

        <section aria-labelledby="results-heading" aria-busy={loading}>
          <div className="results-heading">
            <h2 id="results-heading">Available rooms</h2>
            <span aria-live="polite">
              {!loading &&
                !error &&
                `${properties.length} ${
                  properties.length === 1 ? "room" : "rooms"
                } found`}
            </span>
          </div>

          {loading && (
            <div className="state-panel" role="status">
              Loading rooms…
            </div>
          )}

          {!loading && error && (
            <div className="state-panel error-panel" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="state-panel">
              <h3>No rooms match your search</h3>
              <p>Try another locality or increase your budget.</p>
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
            <div className="property-grid">
              {properties.map((property) => (
                <article className="property-card" key={property.id}>
                  <div className="card-top">
                    <span className="room-type">{property.roomType}</span>
                    {property.verificationStatus === "VERIFIED" && (
                      <span className="verified-badge">Verified</span>
                    )}
                  </div>

                  <h3>{property.title}</h3>
                  <p className="location">{property.locality}</p>

                  <p className="description">
                    {property.description || "No description provided."}
                  </p>

                  <div className="amenities">
                    {property.wifi && <span>Wi-Fi</span>}
                    {property.food && <span>Food</span>}
                    {property.ac && <span>AC</span>}
                    {!property.wifi && !property.food && !property.ac && (
                      <span>No amenities listed</span>
                    )}
                  </div>

                  <div className="card-bottom">
                    <p className="price">
                      {currency.format(property.rent)}
                      <span> / month</span>
                    </p>
                    <span className="available-label">Available</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        SmartRent · Rental & Room Matching
      </footer>
    </div>
  );
}