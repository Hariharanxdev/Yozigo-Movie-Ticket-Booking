
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminApi,
  adminBookingApi,
  type AdminBooking,
} from "../../../services/api";
import "./adminbookingspage.css";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadBookings() {
      try {
        const user = await adminApi.getCurrentUser();

        if (!user.is_admin) {
          if (active) {
            setError("You do not have permission to view bookings.");
          }
          return;
        }

        const data = await adminBookingApi.getAll();
        if (active) setBookings(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load bookings."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBookings();
    return () => {
      active = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !term ||
        String(booking.booking_id).includes(term) ||
        booking.customer_name.toLowerCase().includes(term) ||
        booking.customer_email.toLowerCase().includes(term) ||
        booking.movie_title.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        booking.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const confirmedBookings = bookings.filter(
    (booking) => booking.status.toLowerCase() === "confirmed"
  );

  const totalValue = confirmedBookings.reduce(
    (sum, booking) => sum + booking.total_amount,
    0
  );

  if (loading) {
    return (
      <main className="ab-page">
        <div className="ab-message">Loading bookings...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="ab-page">
        <div className="ab-message">
          <h2>Unable to load bookings</h2>
          <p>{error}</p>
          <Link className="ab-back" to="/admin">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="ab-page">
      <div className="ab-container">
        <header className="ab-header">
          <div>
            <p className="ab-eyebrow">YOZIGO MANAGEMENT</p>
            <h1>Customer Bookings</h1>
            <p className="ab-subtitle">
              Manage reservations, customers, and ticket bookings.
            </p>
          </div>

          <Link className="ab-back" to="/admin">
            <span>←</span> Back to Dashboard
          </Link>
        </header>

        <section className="ab-summary">
          <article className="ab-stat">
            <div className="ab-stat-top">
              <span>Total Bookings</span>
              <span className="ab-stat-icon pink">▣</span>
            </div>
            <strong>{bookings.length}</strong>
            <small>All booking records</small>
          </article>

          <article className="ab-stat">
            <div className="ab-stat-top">
              <span>Confirmed</span>
              <span className="ab-stat-icon green">✓</span>
            </div>
            <strong>{confirmedBookings.length}</strong>
            <small>Successfully confirmed</small>
          </article>

          <article className="ab-stat">
            <div className="ab-stat-top">
              <span>Total Booking Value</span>
              <span className="ab-stat-icon purple">₹</span>
            </div>
            <strong>₹{totalValue.toLocaleString("en-IN")}</strong>
            <small>Confirmed bookings only</small>
          </article>
        </section>

        <section className="ab-table-panel">
          <div className="ab-table-heading">
            <div>
              <h2>All Bookings</h2>
              <p>
                Showing {filteredBookings.length} of {bookings.length} bookings
              </p>
            </div>
          </div>

          <div className="ab-toolbar">
            <label className="ab-search">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search name, email, movie or booking ID..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search bookings"
              />
            </label>

            <select
              className="ab-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter booking status"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {bookings.length === 0 ? (
            <div className="ab-empty">
              <div className="ab-empty-icon">▣</div>
              <h2>No bookings yet</h2>
              <p>
                Customer bookings will appear here after a successful checkout.
              </p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="ab-empty">
              <h2>No matching bookings</h2>
              <p>Try another search term or status filter.</p>
              <button
                className="ab-reset"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="ab-table-wrap">
              <table className="ab-table">
                <thead>
                  <tr>
                    <th>BOOKING</th>
                    <th>CUSTOMER</th>
                    <th>MOVIE & SHOW</th>
                    <th>SEATS</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                    <th>BOOKED AT</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.booking_id}>
                      <td>
                        <span className="ab-booking-id">
                          #{booking.booking_id}
                        </span>
                      </td>

                      <td>
                        <div className="ab-customer">
                          <strong>{booking.customer_name}</strong>
                          <small>{booking.customer_email}</small>
                        </div>
                      </td>

                      <td>
                        <div className="ab-movie">
                          <strong>{booking.movie_title}</strong>
                          <small>Screen: {booking.screen_name}</small>
                          <small>
                            {new Date(
                              booking.show_start_time
                            ).toLocaleString("en-IN")}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span className="ab-seats">
                          {booking.seat_numbers.length
                            ? booking.seat_numbers.join(", ")
                            : "—"}
                        </span>
                      </td>

                      <td className="ab-amount">
                        ₹{booking.total_amount.toLocaleString("en-IN")}
                      </td>

                      <td>
                        <span
                          className={`ab-status ab-status-${booking.status.toLowerCase()}`}
                        >
                          <span className="ab-status-dot" />
                          {booking.status}
                        </span>
                      </td>

                      <td className="ab-date">
                        {new Date(booking.booked_at).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
