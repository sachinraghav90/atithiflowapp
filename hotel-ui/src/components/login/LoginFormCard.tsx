import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Mail, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "../../../supabase/functions/supabase-client.ts";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/redux/slices/isLoggedInSlice.ts";
import { useGetSidebarLinksQuery } from "@/redux/services/hmsApi.ts";
import { useAppSelector } from "@/redux/hook.ts";

const SUPPORT_EMAIL = "support@atithiflow.com";

const LoginFormCard = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isLoggedIn = useAppSelector(state => state.isLoggedIn.value)

  const { data: sidebarLinks } = useGetSidebarLinksQuery(undefined, {
    skip: !isLoggedIn
  })

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      const { data, error } = await login()
      setIsLoading(false);
      if (error) {
        setSubmitMessage(error.message);
        return;
      }
      const authToken = data.session.access_token
      localStorage.setItem("access_token", authToken)
      setSubmitMessage("Logged in success")
      dispatch(loginSuccess())
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !sidebarLinks || !Array.isArray(sidebarLinks.sidebarLinks)) return
    const redirectPath = sidebarLinks?.sidebarLinks?.[0]?.endpoint
    navigate(redirectPath)
  }, [isLoggedIn, sidebarLinks])

  async function login() {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  return (
    <div className="flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 bg-muted/30 min-h-[calc(100vh-64px)] lg:min-h-screen">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ position: "relative" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Login Card */}
        <div className="bg-card rounded-[5px] border border-border shadow-lg p-6 sm:p-8">
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 rounded-t-2xl overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Log in to AtithiFlow</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Access your account to manage your properties and guest experiences.
            </p>
          </div>

          {/* Error Alert */}
          {submitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-muted rounded-[3px] border border-border"
            >
              <p className="text-sm text-muted-foreground text-center" role="status" aria-live="polite">
                {submitMessage}
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"}`}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert" aria-live="polite">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`h-11 pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"}`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive" role="alert" aria-live="polite">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>

              <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                  >
                    Forgot password?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Password Reset</DialogTitle>
                    <DialogDescription className="pt-2">
                      Password reset is handled by our support team. Please contact support to reset your access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end mt-4">
                    <Button asChild variant="default">
                      <a href={`mailto:${SUPPORT_EMAIL}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Contact Support
                      </a>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 rounded-[3px] text-base font-medium"
              variant="hero"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Logging in...
                </span>
              ) : (
                "Log in"
              )}
            </Button>

            {/* Trouble Logging In */}
            <p className="text-center text-sm text-muted-foreground pt-2">
              Having trouble logging in?{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                Contact support
              </a>
            </p>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* New to AtithiFlow */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              New to AtithiFlow?{" "}
              <Link
                to="/contact"
                className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                Request a demo
              </Link>
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          className="flex items-center justify-center gap-6 mt-6 text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-secondary" />
            <span className="text-xs">Enterprise-grade security</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs">99.9% uptime</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Mobile brand context */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="lg:hidden mt-8 text-center px-4"
      >
        <p className="text-sm text-muted-foreground">
          Manage reservations, operations, and guest experiences — all in one place.
        </p>
      </motion.div>
    </div>
  );
};

export default LoginFormCard;
