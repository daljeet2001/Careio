import LoginPage from "./pages/LoginPage.jsx";
import Homepage from "./pages/Homepage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import { ProtectedRoute } from "./components/Protected.jsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Homepage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
