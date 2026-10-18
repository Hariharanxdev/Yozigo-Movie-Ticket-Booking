import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminApi,
  adminBookingApi,
  movieApi,
  showApi,
  showMetricsApi,
  type AdminBooking,
  type ShowMetric,
} from "../../../services/api";
import type { Movie, Show } from "../../../types";
import "./admindashboardpage.css";

type DashboardData = {
  movies: Movie[];
  shows: Show[];
  bookings: AdminBooking[];
  metrics: ShowMetric[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    movies: [],
    shows: [],
    bookings: [],
    metrics: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const user = await adminApi.getCurrentUser();
      if (!user.is_admin) {
        setError("Admin access is required to view this dashboard.");
        setLoading(false);
        return;
      }

      const [movies, shows, bookings, metrics] = await Promise.all([
        movieApi.getAll(),
        showApi.getAll(),
        adminBookingApi.getAll(),
        showMetricsApi.getAll(),
      ]);

      setData({ movies, shows, bookings, metrics });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();

    const handleFocus = () => void loadDashboard();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadDashboard]);

  const confirmedBookings = data.bookings.filter(
    (booking) => booking.status.toLowerCase() === "confirmed"
  );
  const cancelledBookings = data.bookings.filter(
    (booking) => booking.status.toLowerCase() === "cancelled"
  );

  // Use the show-metrics endpoint for revenue when available.
  const confirmedRevenue = data.metrics.length
    ? data.metrics.reduce((sum, show) => sum + show.total_revenue, 0)
    : confirmedBookings.reduce((sum, booking) => sum + booking.total_amount, 0);

  const formatMoney = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <main className="admin-dashboard">
        <div className="dashboard-container">
          <p className="dashboard-message">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-dashboard">
        <div className="dashboard-container">
          <div className="dashboard-error">
            <p className="dashboard-eyebrow">YOZIGO MANAGEMENT</p>
            <h1>Admin Dashboard</h1>
            <p>{error}</p>
            <div className="dashboard-actions">
              <button className="dashboard-primary-button" onClick={() => {
                setLoading(true);
                void loadDashboard();
              }}>
                Try again
              </button>
              <Link className="dashboard-secondary-button" to="/">Back to website</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const cards = [
    {
      label: "Total Movies",
      value: String(data.movies.length),
      detail: "Movies in your catalogue",
      icon: "▣",
      tone: "pink",
      link: "/admin/movies",
      linkLabel: "Manage movies",
    },
    {
      label: "Scheduled Shows",
      value: String(data.shows.length),
      detail: "Shows currently listed",
      icon: "◷",
      tone: "purple",
      link: "/admin/shows",
      linkLabel: "Manage shows",
    },
    {
      label: "Customer Bookings",
      value: String(data.bookings.length),
      detail: `${confirmedBookings.length} confirmed · ${cancelledBookings.length} cancelled`,
      icon: "▤",
      tone: "blue",
      link: "/admin/bookings",
      linkLabel: "View bookings",
    },
    {
      label: "Confirmed Revenue",
      value: formatMoney(confirmedRevenue),
      detail: "Revenue from confirmed bookings",
      icon: "₹",
      tone: "green",
      link: "/admin/bookings",
      linkLabel: "View revenue details",
    },
  ];

  const recentShows = [...data.shows]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 4);

  return (
    <main className="admin-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">YOZIGO MANAGEMENT</p>
            <h1>Admin Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back. Manage your movies, showtimes, and customer bookings from one place.
            </p>
          </div>
          <div className="dashboard-header-actions">
            <Link className="dashboard-home-link" to="/">View website ↗</Link>
            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={() => {
                setLoading(true);
                void loadDashboard();
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span className="dashboard-welcome-label">ADMIN OVERVIEW</span>
            <h2>Your cinema at a glance</h2>
            <p>Here is the latest summary from your booking system.</p>
          </div>
          <div className="dashboard-welcome-symbol" aria-hidden="true">Y</div>
        </section>

        <section className="dashboard-stats" aria-label="Dashboard statistics">
          {cards.map((card) => (
            <article className="dashboard-stat" key={card.label}>
              <div className="dashboard-stat-top">
                <span>{card.label}</span>
                <span className={`dashboard-stat-icon ${card.tone}`} aria-hidden="true">
                  {card.icon}
                </span>
              </div>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
              <Link className="dashboard-stat-link" to={card.link}>
                {card.linkLabel} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">QUICK ACTIONS</p>
              <h2>What would you like to manage?</h2>
            </div>
          </div>
          <div className="dashboard-grid">
            <Link className="dashboard-card" to="/admin/movies">
              <span className="dashboard-card-icon pink">＋</span>
              <div>
                <h3>Add or update a movie</h3>
                <p>Create movie listings, upload posters, edit details, or remove a movie.</p>
              </div>
              <span className="dashboard-card-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link className="dashboard-card" to="/admin/shows">
              <span className="dashboard-card-icon purple">◷</span>
              <div>
                <h3>Schedule a show</h3>
                <p>Choose a movie, screen, date, time, and ticket price.</p>
              </div>
              <span className="dashboard-card-arrow" aria-hidden="true">↗</span>
            </Link>
            <Link className="dashboard-card" to="/admin/bookings">
              <span className="dashboard-card-icon blue">▤</span>
              <div>
                <h3>Review customer bookings</h3>
                <p>Search reservations, check seats and statuses, and review show performance.</p>
              </div>
              <span className="dashboard-card-arrow" aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">BOOKING ANALYTICS</p>
              <h2>Show-wise Booking Metrics</h2>
              <p className="dashboard-subtitle">
                Occupancy and confirmed revenue for each scheduled show.
              </p>
            </div>
          </div>

          <div className="dashboard-metrics-grid">
            {data.metrics.map((show) => (
              <article className="dashboard-metric-card" key={show.show_id}>
                <div className="dashboard-metric-header">
                  <div>
                    <span className="dashboard-eyebrow">
                      SHOW #{show.show_id}
                    </span>
                    <h3>{show.movie_title}</h3>
                    <p>{show.screen_name}</p>
                    <small>
                      {new Date(show.start_time).toLocaleString("en-IN")}
                    </small>
                  </div>

                  <span className="dashboard-occupancy-badge">
                    {show.occupancy_percentage.toFixed(2)}%
                  </span>
                </div>

                <div
                  className="dashboard-metric-track"
                  role="progressbar"
                  aria-label={`${show.movie_title} occupancy`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={show.occupancy_percentage}
                >
                  <div
                    className="dashboard-metric-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, show.occupancy_percentage)
                      )}%`,
                    }}
                  />
                </div>

                <div className="dashboard-metric-stats">
                  <div>
                    <small>Seats booked</small>
                    <strong>
                      {show.seats_booked} / {show.total_seats}
                    </strong>
                  </div>
                  <div>
                    <small>Available</small>
                    <strong>{show.seats_available}</strong>
                  </div>
                  <div>
                    <small>Confirmed revenue</small>
                    <strong className="dashboard-metric-revenue">
                      ₹{show.total_revenue.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>

                <Link
                  className="dashboard-metric-button"
                  to="/admin/bookings"
                >
                  View customer bookings ({show.bookings.length})
                  <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-lower-grid">
          <div className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="dashboard-eyebrow">SCHEDULE</p>
                <h2>Upcoming shows</h2>
              </div>
              <Link to="/admin/shows">Manage all →</Link>
            </div>
            {recentShows.length === 0 ? (
              <div className="dashboard-empty">
                <span>◷</span>
                <h3>No shows scheduled yet</h3>
                <p>Create your first show to start accepting bookings.</p>
                <Link className="dashboard-inline-link" to="/admin/shows">Schedule a show</Link>
              </div>
            ) : (
              <div className="dashboard-show-list">
                {recentShows.map((show: Show) => (
                  <div className="dashboard-show-row" key={show.id}>
                    <div className="dashboard-show-date">
                      <span>SHOW</span>
                      <strong>#{show.id}</strong>
                    </div>
                    <div className="dashboard-show-info">
                      <strong>{data.movies.find((movie) => movie.id === show.movie_id)?.title ?? `Movie #${show.movie_id}`}</strong>
                      <span>{show.screen_name || "Screen not specified"}</span>
                      <small>{new Date(show.start_time).toLocaleString("en-IN")}</small>
                    </div>
                    <strong className="dashboard-show-price">{formatMoney(show.ticket_price)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-panel dashboard-performance-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="dashboard-eyebrow">PERFORMANCE</p>
                <h2>Show occupancy</h2>
              </div>
              <Link to="/admin/bookings">View details →</Link>
            </div>
            {data.metrics.length === 0 ? (
              <div className="dashboard-empty">
                <span>▥</span>
                <h3>No show metrics yet</h3>
                <p>Occupancy will appear when show data is available.</p>
              </div>
            ) : (
              <div className="dashboard-occupancy-list">
                {data.metrics.slice(0, 4).map((metric) => (
                  <div className="dashboard-occupancy-row" key={metric.show_id}>
                    <div className="dashboard-occupancy-label">
                      <div>
                        <strong>{metric.movie_title}</strong>
                        <small>{metric.screen_name} · {metric.seats_booked}/{metric.total_seats} seats</small>
                      </div>
                      <strong>{metric.occupancy_percentage.toFixed(1)}%</strong>
                    </div>
                    <div
                      className="dashboard-occupancy-track"
                      role="progressbar"
                      aria-label={`${metric.movie_title} show occupancy`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={metric.occupancy_percentage}
                    >
                      <div
                        className="dashboard-occupancy-fill"
                        style={{ width: `${Math.min(100, Math.max(0, metric.occupancy_percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>YOZIGO ADMIN</span>
          <span>Dashboard data refreshes when you return to this page.</span>
        </footer>
      </div>
    </main>
  );
}
