import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSystemAnalytics } from "@/services/analyticsService";
import { Loader2 } from "lucide-react";

const AUTH_STORAGE_KEY = "analytics_auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get redirect path from location state or default to dashboard
  const from = (location.state as { from?: string })?.from || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Test credentials by making a request to analytics API
      const response = await getSystemAnalytics({ username, password });

      if (response.success) {
        // Store credentials in session storage
        sessionStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ username, password })
        );
        // Navigate to the intended destination
        navigate(from, { replace: true });
      } else {
        if (response.error?.status === 401) {
          setError("Invalid username or password");
        } else {
          setError(
            response.error?.message || "Login failed. Please try again."
          );
        }
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="border border-border bg-card p-12 space-y-8">
          {/* Logo */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">LinkSnip</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access analytics
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12 font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to home
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
