import type { Movie, Show, Seat,Booking } from "../types";


const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

// Generic API request function
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  // Add the saved JWT token when available
  const token = localStorage.getItem("access_token");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      `API error ${response.status}: ${message || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// Authentication API
export interface LoginCredentials {
  email: string;
  password: string;
}

export type RegisterData = LoginCredentials;

export type LoginResponse =
  | string
  | {
      access_token?: string;
      token?: string;
      accessToken?: string;
    };

export const authApi = {
  login: (credentials: LoginCredentials) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

 register: (data: RegisterData) =>
    request<unknown>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface CreateMoviePayload {
  title: string;
  description: string;
  duration_minutes: number;
  language: string;
  poster_url: string;
  certificate: "U" | "UA" | "A";

}

export const adminApi = {
  getCurrentUser: () =>
    request<CurrentUser>("/api/auth/me"),

  createMovie: (movie: CreateMoviePayload) =>
    request<Movie>("/api/movies/", {
      method: "POST",
      body: JSON.stringify(movie),
    }),
  
updateMovie: (movieId: number, movie: CreateMoviePayload) =>
  request<Movie>(`/api/movies/${movieId}`, {
    method: "PUT",
    body: JSON.stringify(movie),
  }),

deleteMovie: (movieId: number) =>
  request<{ message: string }>(`/api/movies/${movieId}`, {
    method: "DELETE",
  }),

  updateShowPrice: (showId: number, ticketPrice: number) =>
  request<Show>(`/api/shows/${showId}/price`, {
    method: "PATCH",
    body: JSON.stringify({
      ticket_price: ticketPrice,
    }),
  }),
  
  createShow: (payload: {
    movie_id: number;
    screen_name: string;
    start_time: string;
    end_time: string;
    ticket_price: number;
  }) =>
    request<Show>("/api/shows/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  uploadPoster: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const headers = new Headers();
    const token = localStorage.getItem("access_token");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/movies/upload-poster`,
      {
        method: "POST",
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Poster upload failed");
    }

    return response.json() as Promise<{
      message: string;
      filename: string;
      poster_url: string;
    }>;
  },
};

// Movie API
export const movieApi = {
  getAll: () => request<Movie[]>("/api/movies/"),
};

// Showtime API
export const showApi = {
  getAll: () => request<Show[]>("/api/shows/"),

  getById: (showId: number) =>
    request<Show>(`/api/shows/${showId}`),

  holdSeats: (showId: number, seatNumbers: number[]) =>
    request<unknown>(`/api/shows/${showId}/hold`, {
      method: "POST",
      body: JSON.stringify({
        seat_numbers: seatNumbers,
      }),
    }),
};

// Seat API
export const seatApi = {
  getByShowId: (showId: number) =>
    request<Seat[]>(`/api/shows/${showId}/seats`),
};

// Booking API




export interface StripeCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export const bookingApi = {
  createStripeCheckout: (data: {
    show_id: number;
    seat_numbers: number[];
  }) =>
    request<StripeCheckoutResponse>("/api/bookings/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMyBookings: () =>
    request<Booking[]>("/api/bookings/my-bookings"),

  cancelBooking: (bookingId: number) =>
    request<{
      message: string;
      booking_id: number;
      status: string;
      released_seat_numbers: number[];
    }>(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
    }),
};




export interface AdminBooking {
  booking_id: number;
  customer_name: string;
  customer_email: string;
  movie_title: string;
  show_id: number;
  screen_name: string;
  show_start_time: string;
  show_end_time: string;
  seat_numbers: number[];
  total_amount: number;
  status: string;
  booked_at: string;
}

export const adminBookingApi = {
  getAll: () =>
    request<AdminBooking[]>("/api/bookings/admin/all-bookings"),
};


// Movie poster URL helper
export function getPosterUrl(
  posterPath?: string | null
): string {
  if (!posterPath) {
    return "";
  }

  if (
    posterPath.startsWith("http://") ||
    posterPath.startsWith("https://")
  ) {
    return posterPath;
  }

  return `${API_BASE_URL}${
    posterPath.startsWith("/") ? "" : "/"
  }${posterPath}`;
}



export interface ShowBookingDetail {
  booking_id: number;
  customer_name: string;
  customer_email: string;
  seat_numbers: number[];
  total_amount: number;
  booked_at: string;
  status: string;
}

export interface ShowMetric {
  show_id: number;
  movie_title: string;
  screen_name: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
  total_seats: number;
  seats_booked: number;
  seats_available: number;
  occupancy_percentage: number;
  total_revenue: number;
  bookings: ShowBookingDetail[];
}

export const showMetricsApi = {
  getAll: () =>
    request<ShowMetric[]>("/api/shows/admin/metrics"),
};
