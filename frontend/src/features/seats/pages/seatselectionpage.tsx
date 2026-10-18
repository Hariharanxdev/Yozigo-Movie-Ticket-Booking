
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Navbar from "../../../components/layout/navbar";
import {
  movieApi,
  showApi,
  seatApi,
  bookingApi,
} from "../../../services/api";

import type { Movie, Show, Seat } from "../../../types";
import { SeatMap } from "../components/seatmap";

type BookingStatus =
  | "idle"
  | "holding"
  | "held"
  | "processing"
  | "confirmed";

function SeatSelectionPage() {
  const { showId } = useParams();
  const selectedShowId = Number(showId);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);

  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [bookingStatus, setBookingStatus] =
    useState<BookingStatus>("idle");

  // Seat-hold countdown state
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSeatData() {
      setLoading(true);
      setError("");

      try {
        if (!Number.isInteger(selectedShowId) || selectedShowId <= 0) {
          throw new Error("Invalid show selected.");
        }

        const [seatData, showData, movies] = await Promise.all([
          seatApi.getByShowId(selectedShowId),
          showApi.getById(selectedShowId),
          movieApi.getAll(),
        ]);

        if (cancelled) return;

        setSeats(seatData);
        setShow(showData);
        setMovie(
          movies.find((item) => item.id === showData.movie_id) ?? null
        );
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load seat information."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSeatData();

    return () => {
      cancelled = true;
    };
  }, [selectedShowId]);

  
  // Flow 10: Automatically refresh seat availability every 3 seconds.
  useEffect(() => {
    if (!Number.isInteger(selectedShowId) || selectedShowId <= 0) {
      return;
    }

    let cancelled = false;

    const refreshSeats = async () => {
      try {
        const latestSeats = await seatApi.getByShowId(selectedShowId);

        if (!cancelled) {
          setSeats(latestSeats);
        }
      } catch (err) {
        // Keep the current seat map if a temporary refresh fails.
        console.warn("Live seat refresh failed:", err);
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshSeats();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedShowId]);


  const selectedSeats = seats.filter((seat) =>
    selectedSeatIds.includes(seat.id)
  );

  const totalPrice =
    selectedSeats.length * Number(show?.ticket_price ?? 0);

  function toggleSeat(seat: Seat) {
    if (bookingStatus !== "idle") {
      return;
    }

    if (seat.is_booked || seat.status.toLowerCase() === "booked") {
      return;
    }

    const isAlreadySelected = selectedSeatIds.includes(seat.id);

    // Allow customers to deselect a seat.
    if (isAlreadySelected) {
      setSelectedSeatIds((current) =>
        current.filter((id) => id !== seat.id)
      );
      setActionError("");
      return;
    }

    // Maximum of six seats per booking.
    if (selectedSeatIds.length >= 6) {
      setActionError(
        "Maximum seat limit reached! You can select only 6 seats."
      );
      return;
    }

    setSelectedSeatIds((current) => [...current, seat.id]);
    setActionError("");
  }

  async function handleHoldSeats() {
    if (selectedSeats.length === 0) {
      setActionError("Please select at least one seat.");
      return;
    }

    setActionError("");
    setBookingStatus("holding");

    try {
      // The backend expects seat numbers, not seat database IDs.
      const seatNumbers = selectedSeats.map((seat) => seat.seat_number);

      const holdResponse = (await showApi.holdSeats(
        selectedShowId,
        seatNumbers
      )) as { expires_at: string };

      const expiryTime = new Date(holdResponse.expires_at).getTime();

      if (!Number.isFinite(expiryTime)) {
        throw new Error(
          "The server returned an invalid hold expiry time."
        );
      }

      // The hold might expire while the request is in progress.
      if (Date.now() >= expiryTime) {
        setHoldExpiresAt(null);
        setSecondsLeft(0);
        setSelectedSeatIds([]);
        setBookingStatus("idle");
        setActionError(
          "Your seat hold has expired. Please select your seats again."
        );

        const updatedSeats = await seatApi.getByShowId(selectedShowId);
        setSeats(updatedSeats);
        return;
      }

      setHoldExpiresAt(expiryTime);
      setSecondsLeft(
        Math.max(0, Math.ceil((expiryTime - Date.now()) / 1000))
      );
      setBookingStatus("held");
    } catch (err) {
      setBookingStatus("idle");

      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to hold seats. Please try again."
      );

      // Refresh the map in case another customer took a seat.
      try {
        const updatedSeats = await seatApi.getByShowId(selectedShowId);
        setSeats(updatedSeats);
      } catch (refreshError) {
        console.error("Could not refresh seat availability:", refreshError);
      }
    }
  }

  // Update the countdown every second while seats are held.
  useEffect(() => {
    if (bookingStatus !== "held" || holdExpiresAt === null) {
      return;
    }

    let expiryHandled = false;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((holdExpiresAt - Date.now()) / 1000)
      );

      setSecondsLeft(remaining);

      if (remaining === 0 && !expiryHandled) {
        expiryHandled = true;

        setBookingStatus("idle");
        setSelectedSeatIds([]);
        setHoldExpiresAt(null);
        setActionError(
          "Your 5-minute seat hold has expired. Please select your seats again."
        );

        seatApi
          .getByShowId(selectedShowId)
          .then((updatedSeats) => setSeats(updatedSeats))
          .catch((refreshError) => {
            console.error(
              "Could not refresh seats after hold expiry:",
              refreshError
            );
          });
      }
    };

    updateCountdown();

    const timerId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timerId);
  }, [bookingStatus, holdExpiresAt, selectedShowId]);


async function handleCheckout() {
  if (bookingStatus !== "held") {
    return;
  }

  if (holdExpiresAt === null || Date.now() >= holdExpiresAt) {
    setBookingStatus("idle");
    setSelectedSeatIds([]);
    setHoldExpiresAt(null);
    setSecondsLeft(0);
    setActionError(
      "Your seat hold has expired. Please select your seats again."
    );

    try {
      const updatedSeats = await seatApi.getByShowId(selectedShowId);
      setSeats(updatedSeats);
    } catch (error) {
      console.error("Could not refresh seats:", error);
    }

    return;
  }

  setActionError("");
  setBookingStatus("processing");

  try {
    const seatNumbers = selectedSeats.map(
      (seat) => seat.seat_number
    );

    const response = await bookingApi.createStripeCheckout({
      show_id: selectedShowId,
      seat_numbers: seatNumbers,
    });

    if (!response.checkout_url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    // Redirect to Stripe's hosted payment page.
    window.location.assign(response.checkout_url);
  } catch (error) {
    if (holdExpiresAt !== null && Date.now() >= holdExpiresAt) {
      setBookingStatus("idle");
      setSelectedSeatIds([]);
      setHoldExpiresAt(null);
      setSecondsLeft(0);
      setActionError(
        "Your seat hold expired. Please select your seats again."
      );
    } else {
      setBookingStatus("held");
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to start Stripe Checkout. Please try again."
      );
    }

    try {
      const updatedSeats = await seatApi.getByShowId(selectedShowId);
      setSeats(updatedSeats);
    } catch (refreshError) {
      console.error("Could not refresh seats:", refreshError);
    }
  }
}


  const formattedTime = `${Math.floor(secondsLeft / 60)}:${String(
    secondsLeft % 60
  ).padStart(2, "0")}`;

  return (
    <div className="app">
      <Navbar />

      <main className="seats-section">
        <Link
          className="back-link"
          to={show ? `/shows/${show.movie_id}` : "/"}
        >
          ← Back to showtimes
        </Link>

        <div className="seats-heading">
          <p className="eyebrow">PICK YOUR PERFECT SEAT</p>

          <h1>Select your seats</h1>

          <p>
            {movie?.title ?? "Movie"} · {show?.screen_name ?? "Cinema screen"}
          </p>

          {show && (
            <p>
              Ticket price: ₹
              {Number(show.ticket_price).toFixed(2)} per seat
            </p>
          )}
        </div>

        {loading && <p className="message">Loading seats...</p>}

        {error && <p className="message error">{error}</p>}

        {!loading && !error && seats.length === 0 && (
          <p className="message">No seats are configured for this show.</p>
        )}

        {!loading && !error && seats.length > 0 && (
          <>
            <SeatMap
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={toggleSeat}
              ticketPrice={Number(show?.ticket_price ?? 0)}
            >
              <SeatMap.Screen />
              <SeatMap.Legend />
              <SeatMap.Rows />
            </SeatMap>

            <section className="booking-summary">
              <div className="selected-info">
                <span className="summary-label">SELECTED SEATS</span>

                <h3>
                  {selectedSeats.length > 0
                    ? selectedSeats.map((seat) => seat.seat_label).join(", ")
                    : "No seats selected"}
                </h3>

                <p>
                  {selectedSeats.length}{" "}
                  {selectedSeats.length === 1 ? "seat" : "seats"} selected
                </p>
              </div>

              <div className="total-info">
                <span className="summary-label">TOTAL AMOUNT</span>
                <h2>₹{totalPrice.toFixed(2)}</h2>
              </div>

              {bookingStatus === "idle" && (
                <button
                  className="continue-button"
                  disabled={selectedSeats.length === 0}
                  onClick={handleHoldSeats}
                >
                  Hold Seats & Continue →
                </button>
              )}

              {bookingStatus === "holding" && (
                <button className="continue-button" disabled>
                  Holding Seats...
                </button>
              )}

              {bookingStatus === "held" && (
                <button
                  className="continue-button"
                  onClick={handleCheckout}
                >
                  Continue to Secure Payment →
                </button>
              )}

              {bookingStatus === "processing" && (
                <button className="continue-button" disabled>
                  Processing Booking...
                </button>
              )}

              {bookingStatus === "confirmed" && (
                <span className="booking-success">✓ Booking Confirmed</span>
              )}
            </section>

            {actionError && (
              <div className="booking-error" role="alert">
                {actionError}
              </div>
            )}

            {bookingStatus === "held" && (
              <section className="booking-confirmation">
                <h2>Seats held successfully</h2>

                <p className="hold-countdown">
                  <strong>Time remaining:</strong>{" "}
                  <span>{formattedTime}</span>
                </p>

                {secondsLeft <= 60 && (
                  <p role="status">
                    Hurry! Your seat hold is about to expire.
                  </p>
                )}

                <p>
                  <strong>Movie:</strong> {movie?.title}
                </p>

                <p>
                  <strong>Screen:</strong> {show?.screen_name}
                </p>

                <p>
                  <strong>Seats:</strong>{" "}
                  {selectedSeats.map((seat) => seat.seat_label).join(", ")}
                </p>

                <p>
                  <strong>Total:</strong> ₹{totalPrice.toFixed(2)}
                </p>

                <p className="summary-note">
                  Your seats are temporarily held for five minutes. Confirm
                  the mock payment before the timer reaches zero. This is a
                  test flow, not a real payment.
                </p>
              </section>
            )}

            {bookingStatus === "confirmed" && (
              <section className="booking-confirmation">
                <h2>Booking confirmed! 🎉</h2>

                <p>Your checkout request succeeded.</p>

                <p>
                  <strong>Movie:</strong> {movie?.title}
                </p>

                <p>
                  <strong>Screen:</strong> {show?.screen_name}
                </p>

                <p>
                  <strong>Seats:</strong>{" "}
                  {selectedSeats.map((seat) => seat.seat_label).join(", ")}
                </p>

                <p>
                  <strong>Tickets:</strong> {selectedSeats.length}
                </p>

                <p>
                  <strong>Total:</strong> ₹{totalPrice.toFixed(2)}
                </p>

                <Link className="primary-button" to="/">
                  Back to Movies
                </Link>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default SeatSelectionPage;
