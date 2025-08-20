import React, { useState } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:3000/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

     
      navigate("/home");
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900 p-4" >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-2xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bebas font-bold">CAREIO</CardTitle>
            <p className="text-sm text-gray-500 font-bebas dark:text-gray-400">
              Sign in to your account
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2 font-bebas">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className=" border-gray-300 dark:border-gray-700 focus-visible:ring-0 rounded-sm"
                />
              </div>

              <div className="space-y-2 font-bebas">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-gray-300 dark:border-gray-700 focus-visible:ring-0 rounded-sm"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full font-medium rounded-lg font-bebas bg-black text-white hover:bg-gray-800 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Divider */}
              <div className="relative flex items-center justify-center font-bebas">
                <span className="h-px w-full bg-gray-200 dark:bg-gray-700"></span>
                <span className="absolute bg-white dark:bg-gray-900 px-2 text-sm text-gray-500 dark:text-gray-400">
                  OR
                </span>
              </div>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 font-bebas">
              Don’t have an account?{" "}
              <a
                href="/signup"
                className="font-medium text-blue-600 hover:underline"
              >
                Sign up
              </a>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default LoginPage;
