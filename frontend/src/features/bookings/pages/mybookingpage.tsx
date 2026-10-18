import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../../../components/layout/navbar";

import {
  bookingApi,
  movieApi,
  showApi,
} from "../../../services/api";

import type { Booking } from "../../../types";
import "./mybookingpage.css";

interface BookingCardData {
  booking: Booking;
  movieTitle: string;
  screenName: string;
  startTime: string | null;
}

function formatSeatLabel(seatNumber: number): string {
  const rowIndex = Math.floor((seatNumber - 1) / 10);
  const seatPosition = ((seatNumber - 1) % 10) + 1;

  if (rowIndex < 0 || rowIndex > 25) {
    return String(seatNumber);
  }

  return `${String.fromCharCode(65 + rowIndex)}${seatPosition}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelMessage, setCancelMessage] = useState("");

  async function handleCancelBooking(bookingId: number) {
  const confirmed = window.confirm(
    `Are you sure you want to cancel booking #${bookingId}?`
  );

  if (!confirmed) return;

  setCancellingId(bookingId);
  setCancelMessage("");
  setError("");

  try {
    const result = await bookingApi.cancelBooking(bookingId);

    setCancelMessage(
      `${result.message}. Released seats: ${result.released_seat_numbers.join(", ")}`
    );

    // Refresh the booking list after cancellation.
    const bookingData = await bookingApi.getMyBookings();
    const [movies, shows] = await Promise.all([
      movieApi.getAll(),
      showApi.getAll(),
    ]);

    setBookings(
      bookingData.map((booking) => {
        const show = shows.find((item) => item.id === booking.show_id);
        const movie = movies.find((item) => item.id === show?.movie_id);

        return {
          booking,
          movieTitle: movie?.title ?? "Movie information unavailable",
          screenName: show?.screen_name ?? "Screen unavailable",
          startTime: show?.start_time ?? null,
        };
      })
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to cancel this booking."
    );
  } finally {
    setCancellingId(null);
  }
}

  useEffect(() => {
    async function loadBookings() {
      try {
        const [bookingData, movies, shows] = await Promise.all([
          bookingApi.getMyBookings(),
          movieApi.getAll(),
          showApi.getAll(),
        ]);

        const bookingCards = bookingData.map((booking) => {
          const show = shows.find(
            (item) => item.id === booking.show_id
          );

          const movie = movies.find(
            (item) => item.id === show?.movie_id
          );

          return {
            booking,
            movieTitle: movie?.title ?? "Movie information unavailable",
            screenName: show?.screen_name ?? "Screen unavailable",
            startTime: show?.start_time ?? null,
          };
        });

        setBookings(bookingCards);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your bookings."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);



  return (
    <div className="app">
      <Navbar />

      <main className="my-bookings-page">
        <div className="bookings-header">
          <p className="eyebrow">YOUR MOVIE HISTORY</p>

          <h1>My Bookings</h1>

          <p>All your confirmed movie bookings in one place.</p>
          {cancelMessage && (
  <div role="status" className="message">
    {cancelMessage}
  </div>
)}
        </div>

        {loading && (
          <p className="message">Loading your bookings...</p>
        )}

        {error && (
          <div className="booking-error" role="alert">
            <p>Could not load your bookings.</p>
            <p>{error}</p>

            {error.includes("401") && (
              <Link className="primary-button" to="/login">
                Login again
              </Link>
            )}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <section className="no-bookings">
            <div className="empty-booking-icon">🎬</div>

            <h2>No bookings yet</h2>

            <p>
              Your movie tickets will appear here after checkout.
            </p>

            <Link className="primary-button" to="/">
              Explore Movies →
            </Link>
          </section>
        )}

        {!loading && !error && bookings.length > 0 && (
          <>
            <div className="bookings-count">
              {bookings.length}{" "}
              {bookings.length === 1 ? "booking" : "bookings"}
            </div>

            <div className="booking-history-list">
              {bookings.map(
                ({ booking, movieTitle, screenName, startTime }) => (
                  <article
                    className="history-card"
                    key={booking.booking_id}
                  >
                    <div className="history-card-top">
                      <div>
                        <span className="history-label">
                          BOOKING ID
                        </span>

                        <p className="booking-id">
                          #{booking.booking_id}
                        </p>
                      </div>

                      <span
                        className={`booking-status ${booking.status.toLowerCase()}`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <div className="history-movie">
                      <div className="history-movie-icon">
                        🎬
                      </div>

                      <div>
                        <h2>{movieTitle}</h2>

                        <p>{screenName}</p>

                        {startTime && (
                          <p>
                            {formatDate(startTime)} ·{" "}
                            {formatTime(startTime)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="history-details">
                      <div>
                        <span className="history-label">
                          SEATS
                        </span>

                        <p className="history-seat-list">
                          {booking.seat_numbers
                            .map(formatSeatLabel)
                            .join(", ")}
                        </p>
                      </div>

                      <div>
                        <span className="history-label">
                          TICKETS
                        </span>

                        <p>{booking.seat_numbers.length}</p>
                      </div>

                      <div>
                        <span className="history-label">
                          BOOKED ON
                        </span>

                        <p>{formatDate(booking.created_at)}</p>
                      </div>
                    </div>

                   <div className="history-card-footer">
  <span>Total amount</span>

  <strong>
    ₹{Number(booking.total_amount).toFixed(2)}
  </strong>
</div>

{booking.status.toLowerCase() === "confirmed" &&
  startTime &&
  new Date(startTime).getTime() - Date.now() > 2 * 60 * 60 * 1000 && (
    <div style={{ padding: "16px 24px" }}>
      <button
        type="button"
        disabled={cancellingId === booking.booking_id}
        onClick={() => handleCancelBooking(booking.booking_id)}
        style={{
          background: "#ff456b",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "10px 18px",
          cursor:
            cancellingId === booking.booking_id ? "wait" : "pointer",
          opacity: cancellingId === booking.booking_id ? 0.6 : 1,
          fontWeight: 600,
        }}
      >
        {cancellingId === booking.booking_id
          ? "Cancelling..."
          : "Cancel Booking"}
      </button>
    </div>
  )}
                  </article>
                )
              )}
            </div>
          </>
        )}

        <div className="bookings-back-link">
          <Link to="/">← Back to Movies</Link>
        </div>
      </main>
    </div>
  );
}

export default MyBookingsPage;