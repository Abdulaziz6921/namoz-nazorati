import { useState } from "react";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { restoreAllFromCloud } from "../../lib/backUpService";
import { ONBOARDING_TERMS } from "../../constants/onboarding";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Spinner from "../ui/Spinner";

export default function AccountStep({ onSkip, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (loading) return;

    setError("");

    if (!email.trim() || !password) {
      setError("Email va parolni kiriting.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      const profile = await restoreAllFromCloud();

      if (profile) {
        onLoginSuccess(profile);
        return;
      }

      onLoginSuccess(null);
    } catch (error) {
      setError(error?.message || "Hisobga kirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card padding="lg">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mb-5">
            <LogIn size={30} strokeWidth={2} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-green-700 font-serif mb-3">
            {ONBOARDING_TERMS.accountTitle}
          </h1>

          <p className="text-green-500 text-sm sm:text-base leading-relaxed max-w-sm">
            {ONBOARDING_TERMS.accountSubtitle}
          </p>
        </div>

        <div className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="onboarding-account-email"
              className="block text-sm font-semibold text-green-700 mb-2"
            >
              Email
            </label>

            <input
              id="onboarding-account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="example@email.com"
              disabled={loading}
              className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-green-800 placeholder:text-green-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="onboarding-account-password"
              className="block text-sm font-semibold text-green-700 mb-2"
            >
              Parol
            </label>

            <div className="relative">
              <input
                id="onboarding-account-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Parolingiz"
                disabled={loading}
                className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 pr-12 text-green-800 placeholder:text-green-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={
                  showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-green-500 hover:bg-green-50 active:bg-green-100"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-green-50 px-4 py-3">
            <ShieldCheck size={18} className="text-green-600 mt-0.5 shrink-0" />

            <p className="text-xs sm:text-sm text-green-600 leading-relaxed text-left">
              Hisobingizga kirganingizda avval saqlangan ma'lumotlaringiz
              tekshiriladi va mavjud bo‘lsa tiklanadi.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size={20} />
                Tekshirilmoqda...
              </>
            ) : (
              <>
                <LogIn size={19} />
                {ONBOARDING_TERMS.accountLoginButton}
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onSkip}
            disabled={loading}
          >
            {ONBOARDING_TERMS.accountSkipButton}
          </Button>
        </div>
      </Card>
    </div>
  );
}
