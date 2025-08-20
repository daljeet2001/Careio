import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/Homepage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import { ProtectedRoute } from "./components/Protected.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
