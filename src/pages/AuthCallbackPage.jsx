import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = `${window.location.origin}/#/hisob`;
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f1eee6] flex items-center justify-center px-5">
      <p className="text-green-800 font-semibold text-center">
        Hisobingiz tekshirilmoqda...
      </p>
    </div>
  );
}
