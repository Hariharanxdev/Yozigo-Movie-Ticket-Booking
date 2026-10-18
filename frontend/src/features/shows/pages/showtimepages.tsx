import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Navbar from "../../../components/layout/navbar";
import { movieApi, showApi } from "../../../services/api";

import type { Movie, Show } from "../../../types";

function ShowtimesPage() {
  const { movieId } = useParams();
  const navigate = useNavigate();

  const selectedMovieId = Number(movieId);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchShowtimes() {
      try {
        if (
          !Number.isInteger(selectedMovieId) ||
          selectedMovieId <= 0
        ) {
          throw new Error("Invalid movie selected.");
        }

        const [movies, allShows] = await Promise.all([
          movieApi.getAll(),
          showApi.getAll(),
        ]);

        const selectedMovie = movies.find(
          (item) => item.id === selectedMovieId
        );

        if (!selectedMovie) {
          throw new Error("Movie not found.");
        }

        setMovie(selectedMovie);

        setShows(
          allShows.filter(
            (show) => show.movie_id === selectedMovieId
          )
        );
      } catch (err) {
        console.error("Error loading showtimes:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Could not load showtimes."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchShowtimes();
  }, [selectedMovieId]);

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value: string) {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div className="app">
      <Navbar />

      <main className="showtimes-section">
        <Link className="back-link" to="/">
          ← Back to movies
        </Link>

        <div className="showtimes-heading">
          <p className="eyebrow">YOUR MOVIE, YOUR SHOW</p>

          <h1>{movie?.title ?? "Choose Your Showtime"}</h1>

          <p>Select a showtime to continue to seat selection.</p>
        </div>

        {loading && (
          <p className="message">Loading showtimes...</p>
        )}

        {error && (
          <p className="message error">{error}</p>
        )}

        {!loading && !error && shows.length === 0 && (
          <div className="empty-shows">
            <span>🎬</span>
            <h2>No shows available</h2>
            <p>
              There are currently no scheduled shows for this movie.
            </p>
          </div>
        )}

        {!loading && !error && shows.length > 0 && (
          <div className="showtime-grid">
            {shows.map((show) => (
              <article
                className="showtime-card"
                key={show.id}
              >
                <div className="showtime-date">
                  <span>SHOW DATE</span>
                  <h2>{formatDate(show.start_time)}</h2>
                </div>

                <div className="showtime-details">
                  <p>
                    <strong>Screen:</strong> {show.screen_name}
                  </p>

                  <p>
                    <strong>Start:</strong>{" "}
                    {formatTime(show.start_time)}
                  </p>

                  <p>
                    <strong>End:</strong>{" "}
                    {formatTime(show.end_time)}
                  </p>
                </div>

                <div className="showtime-footer">
                  <div>
                    <span className="price-label">
                      TICKET PRICE
                    </span>

                    <h2>
                      ₹{Number(show.ticket_price).toFixed(2)}
                    </h2>
                  </div>

                  <button
                    className="book-button"
                    onClick={() =>
                      navigate(`/seats/${show.id}`)
                    }
                  >
                    Select Seats →
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ShowtimesPage;