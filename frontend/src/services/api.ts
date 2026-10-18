
import type { Movie, Show, Seat, Booking } from "../types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

// -------------------- API ERROR HANDLING --------------------

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function getErrorMessage(status: number, detail: unknown): string {
  const backendMessage =
    typeof detail === "string"
      ? detail
      : detail && typeof detail === "object" && "detail" in detail
        ? (detail as { detail: unknown }).detail
        : detail;

  const detailText =
    typeof backendMessage === "string"
      ? backendMessage
      : Array.isArray(backendMessage)
        ? backendMessage
            .map((item) =>
              typeof item === "object" && item !== null && "msg" in item
                ? String(item.msg)
                : String(item)
            )
            .join(", ")
        : "";

  if (status === 401) {
    return "Invalid email or password, or your session has expired. Please try again.";
  }

  if (status === 403) {
    return "You don't have permission to perform this action.";
  }

  if (status === 404) {
    return "The requested information could not be found.";
  }

  if (status === 409) {
    if (/seat/i.test(detailText)) {
      return "Some selected seats are no longer available. Please choose different seats.";
    }

    return detailText || "This action conflicts with the current state. Please refresh and try again.";
  }

  if (status === 422) {
    return "Some information is invalid. Please check your input and try again.";
  }

  if (status === 429) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (status >= 500) {
    return "Something went wrong on the server. Please try again later.";
  }

  return detailText || "Something went wrong. Please try again.";
}

// Generic API request function
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem("access_token");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to connect to the server. Please check your internet connection and try again."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let responseData: unknown = null;

  try {
    if (response.status !== 204) {
      responseData = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    }
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const detail =
      responseData &&
      typeof responseData === "object" &&
      "detail" in responseData
        ? (responseData as { detail: unknown }).detail
        : responseData;

    throw new ApiError(
      response.status,
      detail,
      getErrorMessage(response.status, responseData)
    );
  }

  return responseData as T;
}

// Use this in page components to display friendly errors.
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message || "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

// -------------------- AUTHENTICATION API --------------------

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

// -------------------- USER AND ADMIN API --------------------

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
  getCurrentUser: () => request<CurrentUser>("/api/auth/me"),

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

    let response: Response;

    try {
      response = await fetch(
        `${API_BASE_URL}/api/movies/upload-poster`,
        {
          method: "POST",
          headers,
          body: formData,
        }
      );
    } catch {
      throw new Error(
        "Unable to upload the poster. Please check your connection."
      );
    }

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        responseData &&
        typeof responseData === "object" &&
        "detail" in responseData
          ? responseData.detail
          : responseData;

      throw new ApiError(
        response.status,
        detail,
        getErrorMessage(response.status, detail)
      );
    }

    return responseData as {
      message: string;
      filename: string;
      poster_url: string;
    };
  },
};

// -------------------- MOVIE API --------------------

export const movieApi = {
  getAll: () => request<Movie[]>("/api/movies/"),
};

// -------------------- SHOWTIME API --------------------

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

// -------------------- SEAT API --------------------

export const seatApi = {
  getByShowId: (showId: number) =>
    request<Seat[]>(`/api/shows/${showId}/seats`),
};

// -------------------- BOOKING API --------------------

export interface StripeCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

export const bookingApi = {
  createStripeCheckout: (data: {
    show_id: number;
    seat_numbers: number[];
  }) =>
    request<StripeCheckoutResponse>(
      "/api/bookings/create-checkout-session",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

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

// -------------------- ADMIN BOOKING API --------------------

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

// -------------------- POSTER URL HELPER --------------------

export function getPosterUrl(
  posterPath?: string | null
): string {
  if (!posterPath) {
    return "";
  }

  if (/^https?:\/\//i.test(posterPath)) {
    return posterPath;
  }

  return `${API_BASE_URL}${
    posterPath.startsWith("/") ? "" : "/"
  }${posterPath}`;
}

// -------------------- SHOW METRICS API --------------------

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
