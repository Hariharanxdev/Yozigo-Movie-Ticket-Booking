
import type { Movie } from "../../../types";
import { getPosterUrl } from "../../../services/api";

interface MovieCardProps {
  movie: Movie;
  onBookTickets: (movieId: number) => void;
}

function MovieCard({ movie, onBookTickets }: MovieCardProps) {
  const duration = movie.duration_minutes ?? movie.duration;

  return (
    <article className="movie-card">
      <div className="poster">
        {movie.poster_url ? (
          <img
            src={getPosterUrl(movie.poster_url)}
            alt={`${movie.title} poster`}
          />
        ) : (
          <div className="poster-placeholder">🎬</div>
        )}

        <span className="poster-label">NOW SHOWING</span>
      </div>

      <div className="movie-info">
        <h3>{movie.title}</h3>
        {movie.description && (
          <p className="movie-description">
            {movie.description}
          </p>
        )}
        <p>
          {movie.language} ·{" "}
          {duration != null
            ? `${Math.floor(duration / 60)}h ${duration % 60}m`
            : "Runtime unavailable"}
          {" · "}
          {movie.certificate || "Certificate unavailable"}
        </p>

        <button
          className="book-button"
          onClick={() => onBookTickets(movie.id)}
        >
          Book Tickets <span>→</span>
        </button>
      </div>
    </article>
  );
}

export default MovieCard;
