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

    setLoading(true);
    setError("");

    try {
      const result = await authApi.login({ email, password });

      let accessToken = "";

      if (typeof result === "string") {
        accessToken = result;
      } else {
        accessToken =
          result.access_token ??
          result.token ??
          result.accessToken ??
          "";
      }

      accessToken = accessToken.replace(/^Bearer\s+/i, "").trim();

      if (!accessToken || accessToken.toLowerCase() === "string") {
        throw new Error("Login did not return a valid access token.");
      }

      localStorage.setItem("access_token", accessToken);

// Check whether the logged-in user is an admin.
const currentUser = await adminApi.getCurrentUser();

// Redirect based on the user's role.
if (currentUser.is_admin) {
  navigate("/admin", { replace: true });
} else {
  const destination = location.state?.from;

  const returnTo =
    destination?.pathname &&
    destination.pathname !== "/login" &&
    destination.pathname !== "/register" &&
    !destination.pathname.startsWith("/admin")
      ? `${destination.pathname}${destination.search ?? ""}${destination.hash ?? ""}`
      : "/";

  navigate(returnTo, { replace: true });
}
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      );
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
            />

            {error && (
              <div className="booking-error" role="alert">
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