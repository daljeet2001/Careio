import LoginPage from "./pages/LoginPage.jsx";

import HomePage2 from "./pages/HomePage2.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import { ProtectedRoute } from "./components/Protected.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (

    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedRoute />}> 
          <Route path="/home" element={<HomePage2 />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
