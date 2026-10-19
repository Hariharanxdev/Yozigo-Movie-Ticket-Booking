
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../../../components/layout/navbar";
import { bookingApi } from "../../../services/api";
import "./paymentsuccesspage.css";

type BookingDetails = {
  booking_id: number;
  status: string;
  movie_title: string;
  show_id: number;
  screen_name: string | null;
  show_start_time: string | null;
  show_end_time: string | null;
  seat_numbers: string[];
  total_amount: number;
};

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("The payment session ID is missing.");
      setLoading(false);
      return;
    }

    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkPayment = async () => {
      try {
        const result =
          await bookingApi.getStripePaymentStatus(sessionId);

        if (!active) return;

        if (result.status.toLowerCase() === "confirmed") {
          setBooking(result);
          setLoading(false);
          return;
        }

        if (attempts >= 20) {
          setError(
            "Your payment is being processed. Please check My Bookings shortly."
          );
          setLoading(false);
          return;
        }
      } catch {
        if (!active) return;

        if (attempts >= 20) {
          setError(
            "We couldn't confirm your booking yet. Please check My Bookings before trying to pay again."
          );
          setLoading(false);
          return;
        }
      }

      attempts += 1;
      timer = setTimeout(checkPayment, 2000);
    };

    void checkPayment();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  const formatDate = (value: string | null) => {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const formatTime = (value: string | null) => {
    if (!value) return "Not available";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
  };

  return (
    <>
      <Navbar />

      <main className="payment-success-container">
        {loading && (
          <section className="payment-confirmation-card payment-loading">
            <h2>Verifying your payment...</h2>
            <p>
              Please wait while we confirm your booking.
              Do not pay again.
            </p>
          </section>
        )}

        {!loading && error && (
          <section className="payment-confirmation-card payment-pending">
            <h2>Payment confirmation pending</h2>
            <p>{error}</p>

            <div className="confirmation-actions">
              <Link
                to="/my-bookings"
                className="confirmation-button primary"
              >
                View My Bookings
              </Link>

              <Link
                to="/"
                className="confirmation-button secondary"
              >
                Back to Home
              </Link>
            </div>
          </section>
        )}

        {!loading && booking && (
          <section className="payment-confirmation-card">
            <header className="confirmation-header">
              <span className="confirmation-check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 2.5 2.5L16 9" />
                </svg>
              </span>

              <div>
                <h1>Booking Confirmed!</h1>
                <p>Your payment was successful.</p>
              </div>
            </header>

            <hr className="confirmation-divider" />

            <div className="confirmation-details">
              <div className="confirmation-row">
                <span>Booking ID</span>
                <strong>#{booking.booking_id}</strong>
              </div>

              <div className="confirmation-row">
                <span>Movie</span>
                <strong>{booking.movie_title}</strong>
              </div>

              <div className="confirmation-row">
                <span>Show date</span>
                <strong>{formatDate(booking.show_start_time)}</strong>
              </div>

              <div className="confirmation-row">
                <span>Show time</span>
                <strong>{formatTime(booking.show_start_time)}</strong>
              </div>

              <div className="confirmation-row">
                <span>Seats</span>
                <strong>{booking.seat_numbers.join(", ")}</strong>
              </div>
            </div>

            <hr className="confirmation-divider total-divider" />

            <div className="confirmation-total">
              <strong>Total Paid</strong>
              <strong className="confirmation-amount">
                ₹{booking.total_amount.toFixed(2)}
              </strong>
            </div>

            <div className="confirmation-footer">
              <svg
                className="confirmation-ticket-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M4 7.5A2.5 2.5 0 0 0 4 12.5v4A1.5 1.5 0 0 0 5.5 18h13a1.5 1.5 0 0 0 1.5-1.5v-4a2.5 2.5 0 0 1 0-5v-1A1.5 1.5 0 0 0 18.5 5h-13A1.5 1.5 0 0 0 4 6.5v1Z" />
                <path d="M14 7.5v1M14 11v1M14 14.5v1" />
              </svg>

              <h3>Enjoy your movie!</h3>
              <p>Thank you for booking with Yozigo.</p>
            </div>

            <div className="confirmation-actions">
              <Link
                to="/my-bookings"
                className="confirmation-button primary"
              >
                View My Bookings
              </Link>

              <Link
                to="/"
                className="confirmation-button secondary"
              >
                Back to Home
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
