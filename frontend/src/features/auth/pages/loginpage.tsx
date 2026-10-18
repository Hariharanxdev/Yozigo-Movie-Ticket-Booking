import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Navbar from "../../../components/layout/navbar";
import { authApi, adminApi } from "../../../services/api";

import "./loginpage.css";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // Step 1: Authenticate the user.
      const result = await authApi.login({
        email: email.trim(),
        password,
      });

      let accessToken = "";

      if (typeof result === "string") {
        accessToken = result;
      } else {
        accessToken =
          result?.access_token ??
          result?.token ??
          result?.accessToken ??
          "";
      }

      accessToken = accessToken.replace(/^Bearer\s+/i, "").trim();

      if (!accessToken || accessToken.toLowerCase() === "string") {
        setError("Login failed because the server did not return a valid token.");
        return;
      }

      // Step 2: Save the token only after successful authentication.
      localStorage.setItem("access_token", accessToken);

      // Step 3: Check the user's role separately.
      let isAdmin = false;

      try {
        const currentUser = await adminApi.getCurrentUser();
        isAdmin = Boolean(currentUser?.is_admin);
      } catch {
        // Login succeeded, but the profile/role request failed.
        // Keep the token and continue to the normal user destination.
        console.error("Unable to retrieve the current user's role.");
      }

      // Step 4: Redirect to the appropriate page.
      if (isAdmin) {
        navigate("/admin", { replace: true });
        return;
      }

      const destination = location.state?.from;

      const returnTo =
        destination?.pathname &&
        destination.pathname !== "/login" &&
        destination.pathname !== "/register" &&
        !destination.pathname.startsWith("/admin")
          ? `${destination.pathname}${destination.search ?? ""}${destination.hash ?? ""}`
          : "/";

      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      // Step 5: Show a friendly message instead of raw API details.
      const message =
        err instanceof Error ? err.message : "";

      if (
        /\b401\b/.test(message) ||
        /invalid email or password|incorrect password|unauthorized/i.test(message)
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (
        /failed to fetch|network error|networkerror|load failed/i.test(message)
      ) {
        setError(
          "Unable to connect to the server. Please check your connection and try again."
        );
      } else {
        setError("We couldn't sign you in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <Navbar />

      <main className="login-page">
        <section className="login-card">
          <p className="eyebrow">WELCOME BACK</p>

          <h1>Login to Yozigo</h1>

          <p className="login-description">
            Sign in to continue booking your movie tickets.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
            />

            {error && (
              <div className="booking-error" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <button
              className="continue-button login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login →"}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account?{" "}
            <Link to="/register">Create an account</Link>
          </p>

          <p className="auth-footer">
            <Link to="/">← Back to movies</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
