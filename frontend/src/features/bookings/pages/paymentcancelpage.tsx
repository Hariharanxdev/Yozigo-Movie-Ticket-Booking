
import { Link } from "react-router-dom";
import "./paymentcancelpage.css";

export default function PaymentCancelPage() {
  return (
    <main className="payment-cancel-page">
      <section className="payment-cancel-card">
        <div className="payment-cancel-icon" aria-hidden="true">
          ↩
        </div>

        <h1>Payment Cancelled</h1>

        <p className="payment-cancel-message">
          Your payment was cancelled. No successful payment
          has been confirmed.
        </p>

        <p className="payment-cancel-note">
          Your seat hold may remain active until it expires.
        </p>

        <div className="payment-cancel-actions">
          <Link
            to="/"
            className="payment-cancel-button payment-cancel-button-primary"
          >
            Browse Movies
          </Link>

          <Link
            to="/my-bookings"
            className="payment-cancel-button payment-cancel-button-secondary"
          >
            View My Bookings
          </Link>
        </div>
      </section>
    </main>
  );
}
