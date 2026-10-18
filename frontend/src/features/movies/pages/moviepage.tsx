import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../../../components/layout/navbar";
import Footer from "../../../components/layout/footer";
import MovieCard from "../../movies/components/moviecard";

import { movieApi } from "../../../services/api";
import type { Movie } from "../../../types";

function MovieListPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMovies() {
      try {
        const data = await movieApi.getAll();
        setMovies(data);
      } catch (err) {
        console.error("Error fetching movies:", err);
        setError("Could not load movies. Please check the backend.");
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, []);

  function handleBookTickets(movieId: number) {
    navigate(`/shows/${movieId}`);
  }

  return (
    <div className="app">
      <Navbar />

      <main>
        <section className="hero">
          <p className="eyebrow">
            YOUR NEXT MOVIE NIGHT STARTS HERE
          </p>

          <h1>
            Big screen.
            <br />
            <span>Big feelings.</span>
          </h1>

          <p className="hero-description">
            Find your movie, pick your seats, and make it a
            night to remember.
          </p>

          <a className="primary-button" href="#movies">
            Explore Movies →
          </a>
        </section>

        <section className="movies-section" id="movies">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NOW SHOWING</p>
              <h2>Movies you'll love</h2>
            </div>

            <span className="movie-count">
              {movies.length} movies
            </span>
          </div>

          {loading && (
            <p className="message">Loading movies...</p>
          )}

          {error && (
            <p className="message error">{error}</p>
          )}

          {!loading && !error && movies.length === 0 && (
            <p className="message">
              No movies available yet.
            </p>
          )}

          {!loading && !error && movies.length > 0 && (
            <div className="movie-grid">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onBookTickets={handleBookTickets}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default MovieListPage;