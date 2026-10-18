
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import MovieListPage from "./features/movies/pages/moviepage";
import ShowtimesPage from "./features/shows/pages/showtimepages";
import SeatSelectionPage from "./features/seats/pages/seatselectionpage";
import LoginPage from "./features/auth/pages/loginpage";
import RegisterPage from "./features/auth/pages/registerpage";
import MyBookingsPage from "./features/bookings/pages/mybookingpage";

import AdminPage from "./features/admin/pages/adminpage";
import AdminDashboardPage from "./features/admin/pages/admindashboardpage";
import AdminBookingsPage from "./features/admin/pages/adminbookingspage";

import "./App.css";

function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const token = localStorage.getItem("access_token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer pages */}
        <Route path="/" element={<MovieListPage />} />
        <Route
          path="/shows/:movieId"
          element={<ShowtimesPage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer pages requiring login */}
        <Route
          path="/seats/:showId"
          element={
            <ProtectedRoute>
              <SeatSelectionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin pages */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/movies"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/shows"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute>
              <AdminBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* Unknown URLs */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
