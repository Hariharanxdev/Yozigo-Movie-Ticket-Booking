
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  adminApi,
  movieApi,
  showApi,
} from "../../../services/api";
import type { Movie, Show } from "../../../types";
import "./adminpage.css";

type AccessState = "checking" | "allowed" | "denied";
type Certificate = "U" | "UA" | "A";

function AdminPage() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [loading, setLoading] = useState(true);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});

  // Movie form
  const [editingMovieId, setEditingMovieId] =
    useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("120");
  const [language, setLanguage] = useState("Tamil");
  const [certificate, setCertificate] =
    useState<Certificate>("UA");
  const [description, setDescription] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const [movieSaving, setMovieSaving] = useState(false);
  const [movieError, setMovieError] = useState("");
  const [movieSuccess, setMovieSuccess] = useState("");

  // Show form
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [screenName, setScreenName] = useState("Screen 1");
  const [showDate, setShowDate] = useState("");
  const [showStartTime, setShowStartTime] = useState("");
  const [showTicketPrice, setShowTicketPrice] = useState("150");
  const [showSaving, setShowSaving] = useState(false);
  const [showError, setShowError] = useState("");
  const [showSuccess, setShowSuccess] = useState("");

  // Price editor
  const [savingId, setSavingId] = useState<number | null>(null);
  const [priceError, setPriceError] = useState("");
  const [priceSuccess, setPriceSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAdminPage() {
      try {
        const user = await adminApi.getCurrentUser();

        if (!user.is_admin) {
          if (active) setAccess("denied");
          return;
        }

        const [movieList, showList] = await Promise.all([
          movieApi.getAll(),
          showApi.getAll(),
        ]);

        if (!active) return;

        setMovies(movieList);
        setShows(showList);

        const initialPrices: Record<number, string> = {};
        showList.forEach((show) => {
          initialPrices[show.id] = String(show.ticket_price);
        });

        setPrices(initialPrices);
        setAccess("allowed");
      } catch {
        if (active) setAccess("denied");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAdminPage();

    return () => {
      active = false;
    };
  }, []);

  function resetMovieForm() {
    setEditingMovieId(null);
    setTitle("");
    setDuration("120");
    setLanguage("Tamil");
    setCertificate("UA");
    setDescription("");
    setPosterFile(null);

    if (posterInputRef.current) {
      posterInputRef.current.value = "";
    }
  }

  function startEditMovie(movie: Movie) {
    setEditingMovieId(movie.id);
    setTitle(movie.title);
    setDuration(
      String(movie.duration_minutes ?? movie.duration ?? 120)
    );
    setLanguage(movie.language);
    setCertificate(movie.certificate ?? "UA");
    setDescription(movie.description ?? "");
    setPosterFile(null);
    setMovieError("");
    setMovieSuccess(`Editing "${movie.title}".`);

    if (posterInputRef.current) {
      posterInputRef.current.value = "";
    }

    document
      .getElementById("movie-form")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleMovieSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMovieError("");
    setMovieSuccess("");

    const minutes = Number(duration);

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 500) {
      setMovieError(
        "Running time must be between 1 and 500 minutes."
      );
      return;
    }

    if (!title.trim() || !language.trim()) {
      setMovieError("Movie name and language are required.");
      return;
    }

    const existingMovie = editingMovieId
      ? movies.find((movie) => movie.id === editingMovieId)
      : undefined;

    if (!editingMovieId && !posterFile) {
      setMovieError("Please select a movie poster.");
      return;
    }

    try {
      setMovieSaving(true);

      let posterUrl = existingMovie?.poster_url ?? "";

      if (posterFile) {
        const uploaded = await adminApi.uploadPoster(posterFile);
        posterUrl = uploaded.poster_url;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        duration_minutes: minutes,
        language: language.trim(),
        certificate,
        poster_url: posterUrl,
      };

      if (editingMovieId !== null) {
        const updatedMovie = await adminApi.updateMovie(
          editingMovieId,
          payload
        );

        setMovies((current) =>
          current.map((movie) =>
            movie.id === editingMovieId ? updatedMovie : movie
          )
        );

        setMovieSuccess(`"${updatedMovie.title}" was updated.`);
      } else {
        const newMovie = await adminApi.createMovie(payload);

        setMovies((current) => [...current, newMovie]);
        setMovieSuccess(`"${newMovie.title}" was added.`);
      }

      resetMovieForm();
    } catch (err) {
      setMovieError(
        err instanceof Error ? err.message : "Unable to save movie."
      );
    } finally {
      setMovieSaving(false);
    }
  }

  async function handleDeleteMovie(movieId: number) {
    const movie = movies.find((item) => item.id === movieId);
    if (!movie) return;

    const confirmed = window.confirm(
      `Remove "${movie.title}" from the Movies page?`
    );

    if (!confirmed) return;

    setMovieError("");
    setMovieSuccess("");

    try {
      await adminApi.deleteMovie(movieId);

      setMovies((current) =>
        current.filter((item) => item.id !== movieId)
      );
      setShows((current) =>
        current.filter((show) => show.movie_id !== movieId)
        );

      if (editingMovieId === movieId) {
        resetMovieForm();
      }

      setMovieSuccess(`"${movie.title}" was removed.`);
    } catch (err) {
      setMovieError(
        err instanceof Error ? err.message : "Unable to delete movie."
      );
    }
  }

  async function handleCreateShow(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setShowError("");
    setShowSuccess("");

    const selectedMovie = movies.find(
      (movie) => movie.id === Number(selectedMovieId)
    );

    if (!selectedMovie) {
      setShowError("Please select a movie.");
      return;
    }

    const durationMinutes = Number(
      selectedMovie.duration_minutes ?? selectedMovie.duration
    );

    if (
      !Number.isFinite(durationMinutes) ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      setShowError(
        "This movie has no valid running time. Edit the movie first."
      );
      return;
    }

    const price = Number(showTicketPrice);

    if (!Number.isFinite(price) || price <= 0) {
      setShowError("Enter a ticket price greater than zero.");
      return;
    }

    if (!showDate || !showStartTime) {
      setShowError("Choose a show date and start time.");
      return;
    }

    const startDate = new Date(`${showDate}T${showStartTime}:00`);

    if (
      Number.isNaN(startDate.getTime()) ||
      startDate <= new Date()
    ) {
      setShowError("Choose a date and time in the future.");
      return;
    }

    const endDate = new Date(
      startDate.getTime() + durationMinutes * 60_000
    );

    function formatLocalDateTime(date: Date) {
      const pad = (value: number) => String(value).padStart(2, "0");

      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
      )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds()
      )}`;
    }

    try {
      setShowSaving(true);

      const newShow = await adminApi.createShow({
        movie_id: selectedMovie.id,
        screen_name: screenName,
        start_time: formatLocalDateTime(startDate),
        end_time: formatLocalDateTime(endDate),
        ticket_price: price,
      });

      setShows((current) => [...current, newShow]);

      setPrices((current) => ({
        ...current,
        [newShow.id]: String(newShow.ticket_price),
      }));

      setShowSuccess(
        `Show created for "${selectedMovie.title}" in ${screenName}.`
      );

      setSelectedMovieId("");
      setScreenName("Screen 1");
      setShowDate("");
      setShowStartTime("");
      setShowTicketPrice("150");
    } catch (err) {
      setShowError(
        err instanceof Error ? err.message : "Unable to create show."
      );
    } finally {
      setShowSaving(false);
    }
  }

  async function savePrice(showId: number) {
    setPriceError("");
    setPriceSuccess("");

    const newPrice = Number(prices[showId]);

    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      setPriceError("Enter a valid price greater than zero.");
      return;
    }

    try {
      setSavingId(showId);

      const updatedShow = await adminApi.updateShowPrice(
        showId,
        newPrice
      );

      setShows((current) =>
        current.map((show) =>
          show.id === showId ? updatedShow : show
        )
      );

      setPrices((current) => ({
        ...current,
        [showId]: String(updatedShow.ticket_price),
      }));

      setPriceSuccess(`Price updated for Show #${showId}.`);
    } catch (err) {
      setPriceError(
        err instanceof Error ? err.message : "Unable to update price."
      );
    } finally {
      setSavingId(null);
    }
  }

  if (loading || access === "checking") {
    return (
      <main className="admin-page">
        <p>Checking admin permissions...</p>
      </main>
    );
  }

  if (access !== "allowed") {
    return (
      <main className="admin-page">
        <section className="admin-card">
          <h1>Admin access required</h1>
          <p>
            Only authorized administrators can manage movies and shows.
          </p>
          <Link to="/login" className="admin-link">
            Go to Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-container">
        <header className="admin-heading">
          <p className="admin-eyebrow">YOZIGO MANAGEMENT</p>
          <h1>Admin Dashboard</h1>
          <p>Manage movies, shows, and ticket prices.</p>
        </header>

        <section className="admin-dashboard-stats">
          <article className="admin-stat-card">
            <span>Total Movies</span>
            <strong>{movies.length}</strong>
          </article>
          <article className="admin-stat-card">
            <span>Scheduled Shows</span>
            <strong>{shows.length}</strong>
          </article>
        </section>

        <section className="admin-card" id="movie-form">
          <h2>
            {editingMovieId !== null ? "Edit Movie" : "Add New Movie"}
          </h2>

          <form className="admin-movie-form" onSubmit={handleMovieSubmit}>
            <label htmlFor="movie-title">Movie Name *</label>
            <input
              id="movie-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
            />

            <div className="admin-form-row">
              <div>
                <label htmlFor="movie-duration">
                  Running Time (minutes) *
                </label>
                <input
                  id="movie-duration"
                  type="number"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  min="1"
                  max="500"
                  required
                />
              </div>
              <div>
                <label htmlFor="movie-certificate">Certificate *</label>
                <select
                  id="movie-certificate"
                  value={certificate}
                  onChange={(event) =>
                    setCertificate(event.target.value as Certificate)
                  }
                >
                  <option value="U">U</option>
                  <option value="UA">U/A</option>
                  <option value="A">A</option>
                </select>
              </div>
            </div>

            <label htmlFor="movie-language">Language *</label>
            <input
              id="movie-language"
              type="text"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              maxLength={50}
              required
            />

            <label htmlFor="movie-description">Description</label>
            <textarea
              id="movie-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={3}
            />

            <label htmlFor="movie-poster">
              Movie Poster {editingMovieId === null ? "*" : "(optional)"}
            </label>
            <input
              ref={posterInputRef}
              id="movie-poster"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setPosterFile(event.target.files?.[0] ?? null)
              }
              required={editingMovieId === null}
            />
            <p className="admin-hint">
              JPG, PNG or WEBP. Maximum 5 MB.
              {editingMovieId !== null &&
                " Leave empty to keep the current poster."}
            </p>

            {movieError && (
              <p className="admin-error">{movieError}</p>
            )}
            {movieSuccess && (
              <p className="admin-success">{movieSuccess}</p>
            )}

            <div className="admin-action-buttons">
              <button
                className="admin-save-button"
                type="submit"
                disabled={movieSaving}
              >
                {movieSaving
                  ? "Saving..."
                  : editingMovieId !== null
                    ? "Save Movie Changes"
                    : "Add Movie"}
              </button>

              {editingMovieId !== null && (
                <button
                  className="admin-secondary-button"
                  type="button"
                  onClick={resetMovieForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-card admin-price-section">
          <h2>Movie Management</h2>

          {movies.length === 0 ? (
            <p>No movies available.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Movie</th>
                    <th>Duration</th>
                    <th>Certificate</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((movie) => (
                    <tr key={movie.id}>
                      <td>{movie.title}</td>
                      <td>
                        {movie.duration_minutes ?? movie.duration ?? "—"} min
                      </td>
                      <td>{movie.certificate ?? "UA"}</td>
                      <td>
                        <div className="admin-action-buttons">
                          <button
                            type="button"
                            className="admin-save-button"
                            onClick={() => startEditMovie(movie)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-delete-button"
                            onClick={() => handleDeleteMovie(movie.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-card admin-price-section">
          <h2>Schedule a Show</h2>
          <p className="admin-muted">
            Choose a movie, screen, date, start time and price. The end
            time is calculated using the movie's running time.
          </p>

          <form className="admin-movie-form" onSubmit={handleCreateShow}>
            <label htmlFor="show-movie">Movie *</label>
            <select
              id="show-movie"
              value={selectedMovieId}
              onChange={(event) => setSelectedMovieId(event.target.value)}
              required
            >
              <option value="">Select a movie</option>
              {movies.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title}
                </option>
              ))}
            </select>

            <label htmlFor="show-screen">Screen *</label>
            <select
              id="show-screen"
              value={screenName}
              onChange={(event) => setScreenName(event.target.value)}
              required
            >
              <option value="Screen 1">Screen 1</option>
              <option value="Screen 2">Screen 2</option>
              <option value="Screen 3">Screen 3</option>
              <option value="Screen 4">Screen 4</option>
            </select>

            <div className="admin-form-row">
              <div>
                <label htmlFor="show-date">Show Date *</label>
                <input
                  id="show-date"
                  type="date"
                  value={showDate}
                  onChange={(event) => setShowDate(event.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="show-time">Start Time *</label>
                <input
                  id="show-time"
                  type="time"
                  value={showStartTime}
                  onChange={(event) => setShowStartTime(event.target.value)}
                  required
                />
              </div>
            </div>

            <label htmlFor="show-price">Ticket Price (₹) *</label>
            <input
              id="show-price"
              type="number"
              min="0.01"
              step="0.01"
              value={showTicketPrice}
              onChange={(event) => setShowTicketPrice(event.target.value)}
              required
            />

            {showError && <p className="admin-error">{showError}</p>}
            {showSuccess && (
              <p className="admin-success">{showSuccess}</p>
            )}

            <button
              className="admin-save-button"
              type="submit"
              disabled={showSaving || movies.length === 0}
            >
              {showSaving ? "Creating Show..." : "Create Show"}
            </button>
          </form>
        </section>

        <section className="admin-card admin-price-section">
          <h2>Manage Ticket Prices</h2>
          <p className="admin-muted">
            Edit a show's price and click Save Price. Updates are manual.
          </p>

          {priceError && <p className="admin-error">{priceError}</p>}
          {priceSuccess && <p className="admin-success">{priceSuccess}</p>}

          {shows.length === 0 ? (
            <p>No shows are available yet.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Show ID</th>
                    <th>Movie</th>
                    <th>Start Time</th>
                    <th>Price (₹)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shows.map((show) => {
                    const movie = movies.find(
                      (item) => item.id === show.movie_id
                    );

                    return (
                      <tr key={show.id}>
                        <td>#{show.id}</td>
                        <td>{movie?.title ?? `Movie #${show.movie_id}`}</td>
                        <td>
                          {new Date(show.start_time).toLocaleString()}
                        </td>
                        <td>
                          <input
                            className="admin-price-input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={prices[show.id] ?? ""}
                            onChange={(event) =>
                              setPrices((current) => ({
                                ...current,
                                [show.id]: event.target.value,
                              }))
                            }
                            aria-label={`Price for show ${show.id}`}
                          />
                        </td>
                        <td>
                          <button
                            className="admin-save-button"
                            type="button"
                            disabled={savingId === show.id}
                            onClick={() => savePrice(show.id)}
                          >
                            {savingId === show.id
                              ? "Saving..."
                              : "Save Price"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Link to="/" className="admin-back-link">
          ← Back to Movies
        </Link>
      </div>
    </main>
  );
}

export default AdminPage;
