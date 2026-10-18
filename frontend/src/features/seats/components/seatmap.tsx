import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { Seat } from "../../../types";

interface SeatMapContextValue {
  seats: Seat[];
  selectedSeatIds: number[];
  onToggleSeat: (seat: Seat) => void;
  ticketPrice: number;
}

interface SeatMapProps extends SeatMapContextValue {
  children: ReactNode;
}

const SeatMapContext = createContext<SeatMapContextValue | null>(null);

function useSeatMap() {
  const context = useContext(SeatMapContext);

  if (!context) {
    throw new Error(
      "SeatMap components must be used inside SeatMap."
    );
  }

  return context;
}

function SeatMapRoot({
  seats,
  selectedSeatIds,
  onToggleSeat,
  ticketPrice,
  children,
}: SeatMapProps) {
  return (
    <SeatMapContext.Provider
      value={{
        seats,
        selectedSeatIds,
        onToggleSeat,
        ticketPrice,
      }}
    >
      <section className="cinema-layout">
        {children}
      </section>
    </SeatMapContext.Provider>
  );
}

function Screen() {
  return (
    <div className="screen-area">
      <div className="screen-shape" />
      <p>SCREEN THIS WAY</p>
    </div>
  );
}

function Legend() {
  return (
    <div className="seat-legend">
      <div>
        <span className="legend-seat available" />
        Available
      </div>

      <div>
        <span className="legend-seat selected" />
        Selected
      </div>

      <div>
        <span className="legend-seat booked" />
        Booked
      </div>
    </div>
  );
}


function SeatButton({ seat }: { seat: Seat }) {
  const { selectedSeatIds, onToggleSeat, ticketPrice } = useSeatMap();

  const status = (seat.status ?? "").toLowerCase();
  const isBooked = seat.is_booked || status === "booked";
  const isHeld = status === "held" || status === "on_hold";
  const isSelected = selectedSeatIds.includes(seat.id);
  const seatNumber = Number(seat.seat_label.slice(1));

  const isUnavailable = isBooked || isHeld;

  return (
    <button
      type="button"
      className={[
        "seat-button",
        isBooked ? "booked" : isHeld ? "held" : "available",
        isSelected ? "selected" : "",
        seatNumber === 6 ? "aisle-gap" : "",
      ].join(" ")}
      disabled={isUnavailable}
      onClick={() => onToggleSeat(seat)}
      title={
        isBooked
          ? `${seat.seat_label} is already booked`
          : isHeld
            ? `${seat.seat_label} is held`
            : `${seat.seat_label} - ₹${ticketPrice}`
      }
      aria-label={`Seat ${seat.seat_label}`}
    >
      {seatNumber}
    </button>
  );
}


function SeatRow({ row }: { row: string }) {
  const { seats } = useSeatMap();

  const rowSeats = seats
    .filter((seat) => seat.seat_label.charAt(0) === row)
    .sort((a, b) => a.seat_number - b.seat_number);

  return (
    <div className="seat-row">
      <span className="row-label">{row}</span>

      <div className="seat-row-items">
        {rowSeats.map((seat) => (
          <SeatButton key={seat.id} seat={seat} />
        ))}
      </div>

      <span className="row-label">{row}</span>
    </div>
  );
}

function Rows() {
  const { seats } = useSeatMap();

  const rows = Array.from(
    new Set(seats.map((seat) => seat.seat_label.charAt(0)))
  ).sort();

  return (
    <div className="seat-map">
      {rows.map((row) => (
        <SeatRow key={row} row={row} />
      ))}
    </div>
  );
}

export const SeatMap = Object.assign(SeatMapRoot, {
  Screen,
  Legend,
  Rows,
});