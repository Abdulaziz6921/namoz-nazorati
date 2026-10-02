import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { getAll, putItem } from "../lib/db";
import { useAuth } from "../context/AuthContext";
import AppHeader from "../components/layout/AppHeader";
import Alert from "../components/ui/Alert";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { supabase } from "../lib/supabase";
import {
  backupAllToCloud,
  mergeLocalDataWithCloud,
} from "../lib/backUpService";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  Eye,
  EyeOff,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
  LockKeyhole,
  UserRoundCheck,
} from "lucide-react";

const MODES = {
  LANDING: "landing",
  LOGIN: "login",
  SIGNUP: "signup",
};

export default function HisobPage() {
  const [mode, setMode] = useState(MODES.LANDING);
  const { user, authLoading } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] =
    useState(false);

  const [alertData, setAlertData] = useState(null);

  const [isBackingUp, setIsBackingUp] = useState(false);
  // const [backupMessage, setBackupMessage] = useState("");
  const [lastBackupAt, setLastBackupAt] = useState(null);

  const googleSignupProcessingRef = useRef(false);

  useEffect(() => {
    getAll("settings").then((settings) => {
      const backupSetting = settings.find(
        (item) => item.key === "last_backup_at",
      );

      if (backupSetting?.value) {
        setLastBackupAt(backupSetting.value);
      }
    });
  }, []);

  useEffect(() => {
    if (!alertData) return;

    const timer = setTimeout(() => {
      setAlertData(null);
    }, 6000);

    return () => clearTimeout(timer);
  }, [alertData]);

  useEffect(() => {
    if (authLoading || !user) return;

    const savedPassword = sessionStorage.getItem("signup_password");
    const savedEmail = sessionStorage.getItem("signup_email");

    if (!savedPassword || !savedEmail) return;

    async function finishGoogleSignup() {
      if (googleSignupProcessingRef.current) return;

      googleSignupProcessingRef.current = true;

      if (user.email?.toLowerCase() !== savedEmail.toLowerCase()) {
        await supabase.auth.signOut();

        sessionStorage.removeItem("signup_password");
        sessionStorage.removeItem("signup_email");

        setAlertData({
          variant: "error",
          title: "Email mos kelmadi",
          message:
            "Google hisobidagi email siz kiritgan email bilan bir xil emas.",
        });

        return;
      }

      console.log("Google signup callback:", {
        userEmail: user.email,
        savedEmail,
        hasSavedPassword: Boolean(savedPassword),
      });

      console.log("Calling updateUser...");

      const { data: updatedUser, error } = await supabase.auth.updateUser({
        password: savedPassword,
      });

      console.log("updateUser result:", {
        updatedUser,
        error,
      });

      sessionStorage.removeItem("signup_password");
      sessionStorage.removeItem("signup_email");

      if (error) {
        console.error("Google signup password xatosi:", error);

        setAlertData({
          variant: "error",
          title: "Hisob yaratishda xatolik",
          message: "Parolni hisobingizga saqlashda muammo yuz berdi.",
        });

        return;
      }

      setMode(MODES.LANDING);

      setAlertData({
        variant: "success",
        title: "Hisob muvaffaqiyatli yaratildi",
        message: "Endi email va parolingiz bilan kirishingiz mumkin.",
      });
    }

    finishGoogleSignup();
  }, [user, authLoading]);

  async function handleLoginSubmit(e) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setAlertData({
        variant: "error",
        title: "Kirishda xatolik",
        message: error.message,
      });
      return;
    }

    try {
      await mergeLocalDataWithCloud();

      setAlertData({
        variant: "success",
        title: "Muvaffaqiyatli kirildi",
        message: "Ma’lumotlaringiz tiklandi.",
      });
    } catch (error) {
      console.error("Login merge xatosi:", error);
      setAlertData({
        variant: "error",
        title: "Tiklashda xatolik",
        message:
          "Hisobga kirildi, lekin ma’lumotlarni tiklashda muammo yuz berdi.",
      });
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
      setAlertData({
        variant: "error",
        title: "Parol xatosi",
        message: "Parollar bir xil emas.",
      });
      return;
    }

    const { data, error } = await supabase.functions.invoke(
      "dynamic-function",
      {
        body: {
          email: signupEmail,
        },
      },
    );

    if (error) {
      console.error("Email tekshirish xatosi:", error);

      setAlertData({
        variant: "error",
        title: "Tekshirishda xatolik",
        message: "Emailni tekshirishda muammo yuz berdi.",
      });

      return;
    }

    if (data?.exists) {
      setAlertData({
        variant: "error",
        title: "Hisob allaqachon mavjud",
        message:
          "Bu email bilan hisob allaqachon mavjud. Iltimos, Kirish bo‘limidan foydalaning.",
      });

      return;
    }

    sessionStorage.setItem("signup_password", signupPassword);
    sessionStorage.setItem("signup_email", signupEmail);

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: Capacitor.isNativePlatform()
          ? "com.abdulaziz.namoznazorati://auth/callback"
          : `${window.location.origin}/auth/callback`,
      },
    });

    if (googleError) {
      sessionStorage.removeItem("signup_password");
      sessionStorage.removeItem("signup_email");

      setAlertData({
        variant: "error",
        title: "Google orqali ro‘yxatdan o‘tishda xatolik",
        message: "Hisob yaratishda muammo yuz berdi.",
      });
    }
  }

  async function handleBackup() {
    if (isBackingUp) return;

    setIsBackingUp(true);
    // setBackupMessage("");

    try {
      await backupAllToCloud();

      const backupTime = new Date().toISOString();

      await putItem("settings", {
        key: "last_backup_at",
        value: backupTime,
      });

      setLastBackupAt(backupTime);
      setAlertData({
        variant: "success",
        title: "Zaxira saqlandi",
        message: "Maʼlumotlaringiz bulutga muvaffaqiyatli zaxiralandi.",
      });
    } catch (error) {
      console.error("Backup xatosi:", error);
      setAlertData({
        variant: "error",
        title: "Zaxiralashda xatolik",
        message: "Maʼlumotlarni bulutga saqlashda muammo yuz berdi.",
      });
    } finally {
      setIsBackingUp(false);
    }
  }

  async function handleLogout() {
    setShowLogoutConfirm(true);
  }

  async function confirmLogout() {
    setShowLogoutConfirm(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAlertData({
        variant: "error",
        title: "Chiqishda xatolik",
        message: "Hisobdan chiqishda muammo yuz berdi.",
      });
      return;
    }

    setMode(MODES.LANDING);
  }

  function goToLanding() {
    setMode(MODES.LANDING);
  }
  return (
    <div className="min-h-screen">
      <AppHeader
        title="Hisob va zaxira"
        subtitle="Ma'lumotlaringizni saqlang va sinxronlang"
        showAccount={false}
      />

      <div className="px-3 py-3 lg:px-8 lg:py-10 ">
        {alertData && (
          <Alert
            variant={alertData.variant}
            title={alertData.title}
            message={alertData.message}
            onClose={() => setAlertData(null)}
            className="mb-4"
          />
        )}
        {showLogoutConfirm && (
          <ConfirmDialog
            title="Hisobdan chiqish"
            message="Hisobingizdan chiqishni xohlaysizmi?"
            onConfirm={confirmLogout}
            onCancel={() => setShowLogoutConfirm(false)}
            confirmText="Chiqish"
            cancelText="Bekor qilish"
            variant="danger"
          />
        )}
        <div className="w-full mx-auto">
          {authLoading ? (
            <div className="min-h-[50vh] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
            </div>
          ) : user ? (
            <AccountView
              user={user}
              onLogout={handleLogout}
              onBackup={handleBackup}
              isBackingUp={isBackingUp}
              lastBackupAt={lastBackupAt}
            />
          ) : (
            <>
              {mode === MODES.LANDING && (
                <LandingView
                  onLogin={() => setMode(MODES.LOGIN)}
                  onSignup={() => setMode(MODES.SIGNUP)}
                />
              )}

              {mode === MODES.LOGIN && (
                <LoginView
                  email={loginEmail}
                  setEmail={setLoginEmail}
                  password={loginPassword}
                  setPassword={setLoginPassword}
                  showPassword={showLoginPassword}
                  setShowPassword={setShowLoginPassword}
                  onBack={goToLanding}
                  onSignup={() => setMode(MODES.SIGNUP)}
                  onSubmit={handleLoginSubmit}
                />
              )}

              {mode === MODES.SIGNUP && (
                <SignupView
                  email={signupEmail}
                  setEmail={setSignupEmail}
                  password={signupPassword}
                  setPassword={setSignupPassword}
                  confirmPassword={signupConfirmPassword}
                  setConfirmPassword={setSignupConfirmPassword}
                  showPassword={showSignupPassword}
                  setShowPassword={setShowSignupPassword}
                  showConfirmPassword={showSignupConfirmPassword}
                  setShowConfirmPassword={setShowSignupConfirmPassword}
                  onBack={goToLanding}
                  onLogin={() => setMode(MODES.LOGIN)}
                  onSubmit={handleSignupSubmit}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   AccountView
------------------------------------------------------- */
function AccountView({
  user,
  onLogout,
  onBackup,
  isBackingUp,
  // backupMessage,
  lastBackupAt,
}) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f1eee6]">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Account */}
          <section className="bg-white rounded-2xl border border-green-900/10 shadow-sm p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-green-800 text-cream-50 flex items-center justify-center">
                <UserRoundCheck size={22} strokeWidth={2} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-bold text-green-900">
                  Hisobga kirilgan
                </h2>

                <p className="text-sm text-gray-500 mt-1 break-all">
                  {user.email}
                </p>
              </div>
            </div>
          </section>

          {/* Backup */}
          <section className="bg-white rounded-2xl border border-green-900/10 shadow-sm p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#f3e7c2] text-green-900 flex items-center justify-center">
                <Cloud size={22} strokeWidth={2} />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-bold text-green-900">
                  Zaxira nusxasi
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Maʼlumotlaringizni bulutga saqlash va boshqa qurilmada tiklash
                  imkoniyati.
                </p>

                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ShieldCheck size={17} className="text-green-700" />
                    <span>Maʼlumotlaringiz bulutga zaxiralanadi.</span>
                  </div>
                  {lastBackupAt && (
                    <p className="text-xs text-gray-500 mt-3">
                      Oxirgi zaxira:{" "}
                      {new Date(lastBackupAt).toLocaleString("uz-UZ", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={onBackup}
                    disabled={isBackingUp}
                    className="w-full mt-4 rounded-xl bg-green-800 text-cream-50 font-semibold py-3.5 px-4 hover:bg-green-900 active:bg-green-950 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isBackingUp
                      ? "Zaxiralanmoqda..."
                      : "Zaxira nusxasini saqlash"}
                  </button>

                  {/* {backupMessage && (
                    <p className="text-sm text-gray-600 mt-3">
                      {backupMessage}
                    </p>
                  )} */}
                </div>
              </div>
            </div>
          </section>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-2xl bg-white border border-red-200 text-red-600 font-semibold py-3.5 px-4 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            Hisobdan chiqish
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   LANDING
------------------------------------------------------- */

function LandingView({ onLogin, onSignup }) {
  return (
    <div className="space-y-6">
      <section className="text-center pt-2 pb-2">
        <div className="mx-auto w-16 h-16 rounded-[1.35rem] bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center shadow-gold">
          <Cloud size={32} className="text-green-900" strokeWidth={1.8} />
        </div>

        <h2 className="mt-5 text-xl sm:text-2xl font-bold text-green-700 tracking-tight">
          Ma'lumotlaringiz siz bilan birga
        </h2>

        <p className="mt-2 max-w-md mx-auto text-sm sm:text-base text-green-500/70 leading-relaxed">
          Hisob yaratib, namoz va qazo ma'lumotlaringizni xavfsiz saqlang va
          kerak bo'lganda boshqa qurilmada davom eting.
        </p>
      </section>

      <section className="space-y-3">
        <AccountAction
          icon={LogIn}
          title="Hisobga kirish"
          description="Hisobingiz mavjud bo'lsa"
          onClick={onLogin}
        />

        <AccountAction
          primary
          icon={UserPlus}
          title="Yangi hisob yaratish"
          description="Ro‘yxatdan o‘ting"
          onClick={onSignup}
        />
      </section>

      <BackupInfo />
    </div>
  );
}

function AccountAction({
  icon: Icon,
  title,
  description,
  onClick,
  primary = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-card md:p-5 p-2 text-left transition-all duration-200 active:scale-[0.99] ${
        primary
          ? "bg-green-700 shadow-soft hover:bg-green-800"
          : "bg-cream-50 shadow-card hover:shadow-soft"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            primary ? "bg-gold-400/15" : "bg-green-50"
          }`}
        >
          <Icon
            size={24}
            className={primary ? "text-gold-300" : "text-green-600"}
            strokeWidth={2}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-base sm:text-lg ${
              primary ? "text-cream-50" : "text-green-700"
            }`}
          >
            {title}
          </h3>

          <p
            className={`text-sm mt-0.5 ${
              primary ? "text-cream-200/65" : "text-green-500/65"
            }`}
          >
            {description}
          </p>
        </div>

        <ArrowRight
          size={21}
          className={`shrink-0 transition-all ${
            primary
              ? "text-cream-200/50 group-hover:text-gold-300"
              : "text-green-300 group-hover:text-green-600"
          } group-hover:translate-x-0.5`}
          strokeWidth={2}
        />
      </div>
    </button>
  );
}

/* -------------------------------------------------------
   LOGIN
------------------------------------------------------- */

function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  onBack,
  onSignup,
  onSubmit,
}) {
  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />

      <div className="text-center pt-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
          <LogIn size={27} className="text-green-600" strokeWidth={1.9} />
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-bold text-green-700">
          Hisobga kirish
        </h2>

        <p className="mt-1.5 text-sm text-green-500/65">
          Hisobingizga kirib, ma'lumotlaringizni davom ettiring.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-cream-50 rounded-card shadow-card p-5 sm:p-6 space-y-4"
      >
        <EmailInput value={email} onChange={setEmail} />

        <PasswordInput
          value={password}
          onChange={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          label="Parol"
        />

        <button
          type="button"
          className="text-green-600 text-sm font-medium hover:text-green-800 transition-colors"
        >
          Parolni unutdingizmi?
        </button>

        <button
          type="submit"
          className="w-full bg-green-700 hover:bg-green-800 text-cream-50 rounded-xl py-3.5 font-semibold transition-all active:scale-[0.98]"
        >
          Kirish
        </button>
      </form>

      <div className="text-center text-sm">
        <span className="text-green-500/60">Hisobingiz yo'qmi?</span>{" "}
        <button
          type="button"
          onClick={onSignup}
          className="text-green-600 font-semibold hover:text-green-800 transition-colors"
        >
          Yangi hisob yarating
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   SIGN UP
------------------------------------------------------- */

function SignupView({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  onBack,
  onLogin,
  onSubmit,
}) {
  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />

      <div className="text-center pt-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center">
          <UserPlus size={27} className="text-green-600" strokeWidth={1.9} />
        </div>

        <h2 className="mt-4 text-xl sm:text-2xl font-bold text-green-700">
          Yangi hisob yaratish
        </h2>

        <p className="mt-1.5 text-sm text-green-500/65">
          Ma'lumotlaringizni saqlash uchun hisob yarating.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-cream-50 rounded-card shadow-card p-5 sm:p-6 space-y-4"
      >
        <EmailInput value={email} onChange={setEmail} />

        <PasswordInput
          value={password}
          onChange={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          label="Parol"
        />

        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          showPassword={showConfirmPassword}
          setShowPassword={setShowConfirmPassword}
          label="Parolni tasdiqlang"
        />

        <div className="bg-green-50 rounded-xl p-3.5 flex items-start gap-3">
          <ShieldCheck
            size={18}
            className="text-green-600 shrink-0 mt-0.5"
            strokeWidth={1.8}
          />

          <p className="text-green-600/75 text-xs leading-relaxed">
            Hisob yaratish orqali ma'lumotlaringizni keyinchalik zaxiralash va
            boshqa qurilmada tiklash imkoniyati paydo bo'ladi.
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-green-700 hover:bg-green-800 text-cream-50 rounded-xl py-3.5 font-semibold transition-all active:scale-[0.98]"
        >
          Hisob yaratish
        </button>
      </form>

      <div className="text-center text-sm">
        <span className="text-green-500/60">Allaqachon hisobingiz bormi?</span>{" "}
        <button
          type="button"
          onClick={onLogin}
          className="text-green-600 font-semibold hover:text-green-800 transition-colors"
        >
          Kirish
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   INPUTS
------------------------------------------------------- */

function EmailInput({ value, onChange }) {
  return (
    <div>
      <label className="block text-green-600 text-sm font-medium mb-2">
        Email
      </label>

      <div className="relative">
        <Mail
          size={19}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-green-300"
          strokeWidth={1.8}
        />

        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="email@example.com"
          autoComplete="email"
          required
          className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-cream-200 bg-cream-50 text-green-700 placeholder:text-green-300/70 focus:outline-none focus:border-green-400 transition-colors"
        />
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  showPassword,
  setShowPassword,
  label,
}) {
  return (
    <div>
      <label className="block text-green-600 text-sm font-medium mb-2">
        {label}
      </label>

      <div className="relative">
        <LockKeyhole
          size={19}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-green-300"
          strokeWidth={1.8}
        />

        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={label === "Parol" ? "current-password" : "new-password"}
          required
          minLength={6}
          className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-cream-200 bg-cream-50 text-green-700 placeholder:text-green-300/70 focus:outline-none focus:border-green-400 transition-colors"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-green-400 hover:text-green-700 hover:bg-green-50 transition-colors"
          aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
        >
          {showPassword ? (
            <EyeOff size={19} strokeWidth={1.8} />
          ) : (
            <Eye size={19} strokeWidth={1.8} />
          )}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   SHARED
------------------------------------------------------- */

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-green-500/70 hover:text-green-700 text-md font-medium transition-colors"
    >
      <ArrowLeft size={18} strokeWidth={2} />
      <span>Orqaga</span>
    </button>
  );
}

function BackupInfo() {
  return (
    <section className="bg-cream-50 rounded-card shadow-card p-3 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
          <ShieldCheck size={21} className="text-green-600" strokeWidth={1.9} />
        </div>

        <div>
          <h3 className="text-green-700 font-semibold">
            Hisob bilan nimalar saqlanadi?
          </h3>

          <p className="text-green-500/60 text-xs mt-0.5">
            Zaxira va sinxronlash imkoniyatlari
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          "Namozlar tarixi",
          "Qazo ma'lumotlari va rejalar",
          "Profil va namoz sozlamalari",
          "Bildirishnoma sozlamalari",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <Check size={13} className="text-green-600" strokeWidth={2.5} />
            </div>

            <span className="text-green-600 text-sm">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
