
import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import Navbar from "../../../components/layout/navbar";
import { bookingApi } from "../../../services/api";
import "./demopaymentpage.css";

type PaymentPageState = {
  movieTitle: string;
  seatLabels: string[];
  seatNumbers: number[];
  totalPrice: number;
  holdExpiresAt: number;
};

export default function DemoPaymentPage() {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as PaymentPageState | null;

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [error, setError] = useState("");

  const holdExpiresAt = state?.holdExpiresAt ?? 0;

  useEffect(() => {
    if (!holdExpiresAt) {
      setSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((holdExpiresAt - Date.now()) / 1000)
      );

      setSecondsLeft(remaining);

      if (remaining === 0) {
        setError(
          "Your seat hold has expired. Please select your seats again."
        );
        setPaymentFailed(false);
      }
    };

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [holdExpiresAt]);

  const holdExpired =
    !holdExpiresAt || Date.now() >= holdExpiresAt;

  function handleTryAgain() {
    setPaymentFailed(false);
    setError("");
  }

  function handleBackToSeats() {
    navigate(`/seats/${showId}`);
  }

  async function handlePaymentFailure() {
    if (loading) return;

    if (holdExpired || !state || !showId) {
      setError(
        "Your seat hold has expired. Please select your seats again."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await bookingApi.simulateCheckout({
        show_id: Number(showId),
        seat_numbers: state.seatNumbers,
        payment_success: false,
      });

      setPaymentFailed(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment could not be processed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSuccess() {
    if (loading) return;

    if (!state || !showId || holdExpired) {
      setError(
        "Your seat hold has expired. Please select your seats again."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await bookingApi.createStripeCheckout({
        show_id: Number(showId),
        seat_numbers: state.seatNumbers,
      });

      if (!response.checkout_url) {
        throw new Error(
          "Checkout could not be started. Please try again."
        );
      }

      // Preserve the existing Stripe Checkout integration.
      window.location.assign(response.checkout_url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout. Please try again."
      );
      setLoading(false);
    }
  }

  if (
    !state ||
    !showId ||
    !Number.isInteger(Number(showId)) ||
    Number(showId) <= 0
  ) {
    return (
      <div className="app">
        <Navbar />

        <main className="demo-payment-page">
          <section className="demo-payment-card">
            <h1>Payment details unavailable</h1>

            <p>
              Your seat information is missing. Return to seat selection
              and try again.
            </p>

            <Link className="continue-button" to="/">
              Back to movies
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />

      <main className="demo-payment-page">
        <Link
          className="back-link"
          to={`/seats/${showId}`}
        >
          ← Back to seats
        </Link>

        <section className="demo-payment-card">
          <p className="eyebrow">YOZIGO CHECKOUT</p>

          <h1>Payment</h1>

          <p className="demo-payment-subtitle">
            Review your booking before continuing to payment.
          </p>

          <div className="demo-payment-details">
            <div>
              <span>Movie</span>
              <strong>{state.movieTitle}</strong>
            </div>

            <div>
              <span>Selected seats</span>
              <strong>{state.seatLabels.join(", ")}</strong>
            </div>

            <div>
              <span>Total amount</span>
              <strong>₹{state.totalPrice.toFixed(2)}</strong>
            </div>
          </div>

          <div
            className={`demo-payment-countdown ${
              secondsLeft <= 60 ? "countdown-warning" : ""
            }`}
            role="timer"
            aria-live="off"
          >
            <span>Time remaining</span>

            <strong>
              {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </strong>
          </div>

          {error && (
            <div className="payment-error" role="alert">
              <strong>
                {holdExpired
                  ? "Seat hold expired"
                  : "Something went wrong"}
              </strong>

              <p>{error}</p>

              {holdExpired && (
                <button
                  type="button"
                  className="continue-button"
                  onClick={handleBackToSeats}
                >
                  Select seats again
                </button>
              )}
            </div>
          )}

          {paymentFailed && !holdExpired && (
            <div className="payment-error" role="alert">
              <strong>Payment failed</strong>

              <p>
                No booking was created. Your seats remain held until
                the original hold expires. You can try again or return
                to seat selection.
              </p>

              <div className="payment-actions">
                <button
                  type="button"
                  className="continue-button"
                  onClick={handleTryAgain}
                >
                  Try again
                </button>

                <button
                  type="button"
                  className="payment-failure-button"
                  onClick={handleBackToSeats}
                >
                  Back to seats
                </button>
              </div>
            </div>
          )}

          <div className="demo-payment-actions">
            <button
              type="button"
              className="continue-button"
              disabled={loading || holdExpired}
              onClick={handlePaymentSuccess}
            >
              {loading ? "Please wait..." : "Confirm Payment"}
            </button>

            <button
              type="button"
              className="payment-failure-button"
              disabled={loading || holdExpired}
              onClick={handlePaymentFailure}
            >
              {loading ? "Please wait..." : "Cancel Payment"}
            </button>
          </div>

          <p className="demo-payment-note">
            This is a demonstration screen. Confirm Payment opens the
            existing Stripe Checkout.
          </p>
        </section>
      </main>
    </div>
  );
}
