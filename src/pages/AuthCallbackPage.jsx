import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
      const url = window.location.href;
      const code = new URL(url).searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Google OAuth callback error:", error);
          return;
        }
      }

      window.location.href = `${window.location.origin}/#/hisob`;
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#f1eee6] flex items-center justify-center px-5">
      <p className="text-green-800 font-semibold text-center">
        Hisobingiz tekshirilmoqda...
      </p>
    </div>
  );
}
