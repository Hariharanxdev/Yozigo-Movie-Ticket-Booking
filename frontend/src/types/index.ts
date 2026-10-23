export interface Movie {
  id: number;
  title: string;
  description?: string;
  language: string;
  duration?: number;
  duration_minutes?: number;
  poster_url?: string | null;
  certificate?: "U" | "UA" | "A";
  is_active?: boolean;
}

export interface Show {
  id: number;
  movie_id: number;
  screen_name: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
}

export interface Seat {
  id: number;
  show_id: number;
  seat_number: number;
  seat_label: string;
  is_booked: boolean;
  status: string;
}

export interface Booking {
  booking_id: number;
  show_id: number;
  seat_numbers: (number | string)[];
  total_amount: number;
  status: string;
  created_at: string;
}