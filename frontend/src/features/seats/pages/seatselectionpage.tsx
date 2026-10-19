
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Navbar from "../../../components/layout/navbar";
import {
  movieApi,
  showApi,
  seatApi,
} from "../../../services/api";

import type { Movie, Show, Seat } from "../../../types";
import { SeatMap } from "../components/seatmap";

type BookingStatus =
  | "idle"
  | "holding"
  | "held"
  | "processing"
  | "confirmed";

function getFriendlyError(
  err: unknown,
  fallback: string
): string {
  if (err instanceof TypeError) {
    return "Unable to connect to the server. Please check your connection and try again.";
  }

  if (err instanceof Error) {
    const message = err.message.toLowerCase();

    if (
      message.includes("401") ||
      message.includes("unauthorized")
    ) {
      return "Your session may have expired. Please log in again.";
    }

    if (
      message.includes("409") ||
      message.includes("already booked") ||
      message.includes("not available")
    ) {
      return "One or more seats are no longer available. Please refresh the seat map and try again.";
    }

    if (message.includes("expired")) {
      return "Your seat hold has expired. Please select your seats again.";
    }

    if (message.includes("hold")) {
      return "We couldn't hold those seats. Please refresh the seat map and try again.";
    }
  }

  return fallback;
}

function SeatSelectionPage() {
  const { showId } = useParams();
  const navigate = useNavigate();

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

  // Seat-hold countdown state.
  const [holdExpiresAt, setHoldExpiresAt] =
    useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSeatData() {
      setLoading(true);
      setError("");

      try {
        if (
          !Number.isInteger(selectedShowId) ||
          selectedShowId <= 0
        ) {
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
          movies.find(
            (item) => item.id === showData.movie_id
          ) ?? null
        );
      } catch (err) {
        if (cancelled) return;

        setError(
          getFriendlyError(
            err,
            "We couldn't load the seat information. Please try again."
          )
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

  const selectedSeats = seats.filter((seat) =>
    selectedSeatIds.includes(seat.id)
  );

  const totalPrice =
    selectedSeats.length * Number(show?.ticket_price ?? 0);

  function toggleSeat(seat: Seat) {
    if (bookingStatus !== "idle") {
      return;
    }

    if (
      seat.is_booked ||
      seat.status.toLowerCase() === "booked"
    ) {
      return;
    }

    const isAlreadySelected = selectedSeatIds.includes(seat.id);

    if (isAlreadySelected) {
      setSelectedSeatIds((current) =>
        current.filter((id) => id !== seat.id)
      );
      setActionError("");
      return;
    }

    if (selectedSeatIds.length >= 6) {
      setActionError(
        "You can select a maximum of 6 seats per booking."
      );
      return;
    }

    setSelectedSeatIds((current) => [...current, seat.id]);
    setActionError("");
  }

  async function refreshSeats() {
    try {
      const updatedSeats =
        await seatApi.getByShowId(selectedShowId);

      setSeats(updatedSeats);
    } catch (err) {
      console.error("Could not refresh seat availability:", err);
    }
  }

  async function handleHoldSeats() {
    if (selectedSeats.length === 0) {
      setActionError("Please select at least one seat.");
      return;
    }

    setActionError("");
    setBookingStatus("holding");

    try {
      // The backend expects seat numbers, not database IDs.
      const seatNumbers = selectedSeats.map(
        (seat) => seat.seat_number
      );

      const holdResponse = (await showApi.holdSeats(
        selectedShowId,
        seatNumbers
      )) as { expires_at: string };

      const expiryTime = new Date(
        holdResponse.expires_at
      ).getTime();

      if (!Number.isFinite(expiryTime)) {
        throw new Error(
          "The server returned an invalid hold expiry time."
        );
      }

      if (Date.now() >= expiryTime) {
        setHoldExpiresAt(null);
        setSecondsLeft(0);
        setSelectedSeatIds([]);
        setBookingStatus("idle");

        setActionError(
          "Your seat hold has expired. Please select your seats again."
        );

        await refreshSeats();
        return;
      }

      setHoldExpiresAt(expiryTime);
      setSecondsLeft(
        Math.max(
          0,
          Math.ceil((expiryTime - Date.now()) / 1000)
        )
      );
      setBookingStatus("held");
    } catch (err) {
      setBookingStatus("idle");

      setActionError(
        getFriendlyError(
          err,
          "We couldn't hold your seats. Please try again."
        )
      );

      await refreshSeats();
    }
  }

  // Keep the countdown active while the seats are held.
  useEffect(() => {
    if (
      bookingStatus !== "held" ||
      holdExpiresAt === null
    ) {
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

        void refreshSeats();
      }
    };

    updateCountdown();

    const timerId = window.setInterval(
      updateCountdown,
      1000
    );

    return () => window.clearInterval(timerId);
  }, [bookingStatus, holdExpiresAt, selectedShowId]);

  // Navigate to the separate Demo Payment page.
  function handleProceedToPayment() {
    if (bookingStatus !== "held") {
      setActionError(
        "Please hold your seats before proceeding to payment."
      );
      return;
    }

    if (
      holdExpiresAt === null ||
      Date.now() >= holdExpiresAt
    ) {
      setBookingStatus("idle");
      setSelectedSeatIds([]);
      setHoldExpiresAt(null);
      setSecondsLeft(0);

      setActionError(
        "Your seat hold has expired. Please select your seats again."
      );

      void refreshSeats();
      return;
    }

    if (selectedSeats.length === 0) {
      setActionError(
        "Your selected seats are unavailable. Please select your seats again."
      );
      return;
    }

    setActionError("");

    navigate(`/demo-payment/${selectedShowId}`, {
      state: {
        movieTitle: movie?.title ?? "Movie",
        seatLabels: selectedSeats.map(
          (seat) => seat.seat_label
        ),
        seatNumbers: selectedSeats.map(
          (seat) => seat.seat_number
        ),
        totalPrice,
        holdExpiresAt,
      },
    });
  }

  const formattedTime = `${Math.floor(
    secondsLeft / 60
  )}:${String(secondsLeft % 60).padStart(2, "0")}`;

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
            {movie?.title ?? "Movie"} ·{" "}
            {show?.screen_name ?? "Cinema screen"}
          </p>

          {show && (
            <p>
              Ticket price: ₹
              {Number(show.ticket_price).toFixed(2)} per seat
            </p>
          )}
        </div>

        {loading && (
          <p className="message" role="status">
            Loading seats...
          </p>
        )}

        {error && (
          <div className="booking-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="continue-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && seats.length === 0 && (
          <p className="message">
            No seats are configured for this show.
          </p>
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
                <span className="summary-label">
                  SELECTED SEATS
                </span>

                <h3>
                  {selectedSeats.length > 0
                    ? selectedSeats
                        .map((seat) => seat.seat_label)
                        .join(", ")
                    : "No seats selected"}
                </h3>

                <p>
                  {selectedSeats.length}{" "}
                  {selectedSeats.length === 1
                    ? "seat"
                    : "seats"}{" "}
                  selected
                </p>
              </div>

              <div className="total-info">
                <span className="summary-label">
                  TOTAL AMOUNT
                </span>

                <h2>₹{totalPrice.toFixed(2)}</h2>
              </div>

              {bookingStatus === "idle" && (
                <button
                  type="button"
                  className="continue-button"
                  disabled={selectedSeats.length === 0}
                  onClick={handleHoldSeats}
                >
                  Hold Seats & Continue →
                </button>
              )}

              {bookingStatus === "holding" && (
                <button
                  type="button"
                  className="continue-button"
                  disabled
                >
                  Holding Seats...
                </button>
              )}

              {bookingStatus === "held" && (
                <button
                  type="button"
                  className="continue-button"
                  onClick={handleProceedToPayment}
                >
                  Pay →
                </button>
              )}

              {bookingStatus === "processing" && (
                <button
                  type="button"
                  className="continue-button"
                  disabled
                >
                  Processing Booking...
                </button>
              )}

              {bookingStatus === "confirmed" && (
                <span className="booking-success">
                  ✓ Booking Confirmed
                </span>
              )}
            </section>

            {actionError && (
              <div
                className="booking-error"
                role="alert"
                aria-live="assertive"
              >
                <p>{actionError}</p>
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
                  {selectedSeats
                    .map((seat) => seat.seat_label)
                    .join(", ")}
                </p>

                <p>
                  <strong>Total:</strong> ₹
                  {totalPrice.toFixed(2)}
                </p>

                <p className="summary-note">
                  Your seats are temporarily held for five
                  minutes. Continue to the payment page before
                  the timer reaches zero.
                </p>
              </section>
            )}

            {bookingStatus === "confirmed" && (
              <section className="booking-confirmation">
                <h2>Booking confirmed! 🎉</h2>

                <p>Your booking has been confirmed.</p>

                <Link className="primary-button" to="/my-bookings">
                  View My Bookings
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
