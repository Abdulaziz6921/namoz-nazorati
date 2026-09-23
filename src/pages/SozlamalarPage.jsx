import { useEffect, useState } from "react";
import { UZBEK_TERMS } from "../constants/prayers";
import { REGIONS, DEFAULT_REGION, getRegionName } from "../constants/regions";
import { getItem, putItem } from "../lib/db";
import { setStoredRegion, prefetchMonth } from "../lib/prayerTimesService";
import {
  clearAllScheduled,
  getPermissionState,
  requestNotificationPermission,
  schedulePrayerNotifications,
} from "../lib/notificationService";
import AppHeader from "../components/layout/AppHeader";
import ProfileSection from "../components/settings/ProfileSection";
import NotificationSettings from "../components/settings/NotificationSettings";
import {
  Bell,
  Calculator,
  Calendar,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Globe,
  Info,
  MapIcon,
  UserIcon,
} from "lucide-react";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "../lib/notificationSettings";

/* -------------------------------------------------------------------------- */
/* UI HELPERS                                                                 */
/* -------------------------------------------------------------------------- */

function SettingIcon({ children }) {
  return (
    <div
      className="
        w-11
        h-11
        sm:w-12
        sm:h-12
        rounded-full
        bg-green-50
        text-green-700
        flex
        items-center
        justify-center
        shrink-0
      "
    >
      {children}
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
  onClick,
  className = "",
}) {
  const content = (
    <>
      <SettingIcon>{icon}</SettingIcon>

      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-[15px] font-semibold text-green-800 leading-5">
          {title}
        </p>

        {description && (
          <p className="mt-0.5 text-xs sm:text-sm text-green-400 leading-5">
            {description}
          </p>
        )}
      </div>

      {children}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          w-full
          flex
          items-center
          gap-3
          sm:gap-4
          min-h-[72px]
          px-4
          sm:px-5
          py-3
          text-left
          transition-colors
          hover:bg-green-50/40
          active:bg-green-50/70
          ${className}
        `}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`
        flex
        items-center
        gap-3
        sm:gap-4
        min-h-[72px]
        px-4
        sm:px-5
        py-3
        ${className}
      `}
    >
      {content}
    </div>
  );
}

function Section({ children, className = "" }) {
  return (
    <section
      className={`
        overflow-hidden
        rounded-2xl
        border
        border-cream-200
        bg-cream-50/80
        shadow-sm
        shadow-green-900/[0.02]
        ${className}
      `}
    >
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <label
      className={`
        relative inline-flex h-6 w-11 shrink-0 items-center
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />

      {/* Track */}
      <span
        className="
          absolute inset-0
          rounded-full
          bg-gray-300
          transition-colors duration-200
          peer-checked:bg-green-500
        "
      />

      {/* Knob */}
      <span
        className="
          pointer-events-none
          absolute left-1
          h-4 w-4
          rounded-full
          bg-white
          shadow-sm
          transition-transform duration-200
          peer-checked:translate-x-5
        "
      />
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

const DEFAULT_SETTINGS = {
  key: "app_settings",
  notificationsEnabled: false,
  qazoCalculationMethod: "hanafi",
  language: "uz",
  region: DEFAULT_REGION,
};

export default function SozlamalarPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [regionSaving, setRegionSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [notificationsExpanded, setNotificationsExpanded] = useState(
    settings.notificationsEnabled,
  );
  const [profileExpanded, setProfileExpanded] = useState(true);

  useEffect(() => {
    if (loaded) {
      setNotificationsExpanded(settings.notificationsEnabled);
    }
  }, [loaded, settings.notificationsEnabled]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const [saved, permission] = await Promise.all([
          getItem("settings", "app_settings"),
          getPermissionState(),
        ]);

        if (!mounted) return;

        setNotificationPermission(permission);

        const appSettings = {
          ...DEFAULT_SETTINGS,
          ...(saved || {}),
        };

        setSettings(appSettings);
      } catch (error) {
        console.error("Sozlamalarni yuklashda xatolik:", error);
      } finally {
        if (mounted) {
          setLoaded(true);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  async function updateSetting(field, value) {
    const updated = {
      ...settings,
      [field]: value,
    };

    setSettings(updated);

    try {
      await putItem("settings", updated);
    } catch (error) {
      console.error("Sozlamani saqlashda xatolik:", error);
    }
  }

  async function handleRegionChange(slug) {
    if (!slug || slug === settings.region) return;

    setRegionSaving(true);

    try {
      const updated = {
        ...settings,
        region: slug,
      };

      setSettings(updated);
      await putItem("settings", updated);

      await setStoredRegion(slug);

      const now = new Date();

      await prefetchMonth(slug, now.getFullYear(), now.getMonth());

      /*
       * Re-schedule notifications because prayer times
       * depend on the selected region.
       */
      if (updated.notificationsEnabled) {
        await schedulePrayerNotifications(slug);
      }
    } catch (error) {
      console.error("Hududni o'zgartirishda xatolik:", error);
    } finally {
      setRegionSaving(false);
    }
  }

  async function handleNotificationPermissionGranted() {
    try {
      const notificationSettings = await loadNotificationSettings();

      let updatedNotificationSettings = notificationSettings;

      // First-time notification setup
      if (!notificationSettings.notificationsInitialized) {
        updatedNotificationSettings = {
          ...notificationSettings,
          prayerNotifications: true,
          qazoReminders: true,
          notificationSound: true,
          vibration: true,
          perPrayer: Object.fromEntries(
            Object.keys(notificationSettings.perPrayer || {}).map((key) => [
              key,
              true,
            ]),
          ),
          notificationsInitialized: true,
        };

        await saveNotificationSettings(updatedNotificationSettings);
      }

      // Enable global master switch
      const updated = {
        ...settings,
        notificationsEnabled: true,
      };

      setSettings(updated);
      await putItem("settings", updated);

      // Schedule notifications
      await schedulePrayerNotifications(updated.region || DEFAULT_REGION);

      console.log("🔔 Notifications enabled after permission");
    } catch (error) {
      console.error("Failed to enable notifications after permission:", error);
    }
  }

  async function handleNotificationMasterToggle() {
    try {
      const nextEnabled = !settings.notificationsEnabled;

      console.log("🔔 Master toggle:", {
        current: settings.notificationsEnabled,
        next: nextEnabled,
      });

      // Update master immediately
      const updatedAppSettings = {
        ...settings,
        notificationsEnabled: nextEnabled,
      };

      setSettings(updatedAppSettings);
      await putItem("settings", updatedAppSettings);

      // ==========================================
      // OFF
      // ==========================================
      if (!nextEnabled) {
        console.log("🔕 Notifications OFF");

        // IMPORTANT:
        // Do NOT modify notificationSettings.
        // User preferences must remain saved.

        await clearAllScheduled();

        console.log("🔕 All notifications cancelled");

        return;
      }

      // ==========================================
      // ON
      // ==========================================
      console.log("🔔 Notifications ON");

      let permission = await getPermissionState();

      console.log("🔐 Notification permission:", permission);

      if (permission === "default") {
        permission = await requestNotificationPermission();
      }

      if (permission !== "granted") {
        console.log("❌ Notification permission not granted");

        // Roll master back because permission wasn't granted
        const revertedSettings = {
          ...settings,
          notificationsEnabled: false,
        };

        setSettings(revertedSettings);
        await putItem("settings", revertedSettings);

        return;
      }

      // Schedule according to the user's SAVED preferences
      await schedulePrayerNotifications(
        updatedAppSettings.region || DEFAULT_REGION,
      );

      console.log("✅ Notifications enabled and scheduled");
    } catch (error) {
      console.error("❌ Master notification toggle failed:", error);

      // Roll UI/state back if something fails
      const revertedSettings = {
        ...settings,
        notificationsEnabled: false,
      };

      setSettings(revertedSettings);
      await putItem("settings", revertedSettings);
    }
  }

  return (
    <div
      className="
        min-h-screen
        animate-fade-in
        bg-cream-50
        rounded-b-2xl
      "
    >
      <AppHeader title={UZBEK_TERMS.settings} />

      <main
        className="
          w-full
          max-w-6xl
          mx-auto
          px-3
          sm:px-5
          lg:px-8
          pt-4
          sm:pt-5
          lg:pt-6
          pb-24
        "
      >
        {/* ---------------------------------------------------------------- */}
        {/* PROFILE                                                         */}
        {/* ---------------------------------------------------------------- */}

        <div className="mb-4 sm:mb-5">
          <Section>
            <div className="px-4 sm:px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <SettingIcon>
                  <UserIcon />
                </SettingIcon>

                <button
                  type="button"
                  onClick={() => setProfileExpanded((prev) => !prev)}
                  className="
            flex-1
            min-w-0
            text-left
            cursor-pointer
          "
                >
                  <h2 className="text-base sm:text-lg font-semibold text-green-800">
                    Profil
                  </h2>

                  <p className="text-xs sm:text-sm text-green-400 mt-0.5">
                    Shaxsiy ma'lumotlaringiz
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setProfileExpanded((prev) => !prev)}
                  aria-label={
                    profileExpanded
                      ? "Profilni yashirish"
                      : "Profilni ko‘rsatish"
                  }
                  className="
            shrink-0
            p-1
            rounded-lg
            text-green-700
            hover:bg-green-50
            transition-colors
          "
                >
                  {profileExpanded ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </button>
              </div>
            </div>

            {profileExpanded && <ProfileSection />}
          </Section>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* MAIN SETTINGS                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-2
            gap-4
            lg:gap-5
            items-start
          "
        >
          {/* -------------------------------------------------------------- */}
          {/* NOTIFICATIONS                                                   */}
          {/* -------------------------------------------------------------- */}

          <Section className="lg:col-span-2">
            <div
              className="
      px-4
      sm:px-5
      pt-4
      pb-3
      border-b
      border-cream-200
    "
            >
              <div className="flex items-center gap-3">
                <SettingIcon>
                  <Bell />
                </SettingIcon>

                <button
                  type="button"
                  onClick={() => setNotificationsExpanded((prev) => !prev)}
                  className="
          flex-1
          min-w-0
          text-left
          cursor-pointer
        "
                >
                  <h2 className="text-base sm:text-lg font-semibold text-green-800">
                    Eslatmalar
                  </h2>

                  <p className="text-xs sm:text-sm text-green-400 mt-0.5">
                    Namoz va qazo eslatmalarini sozlang
                  </p>
                </button>

                <Toggle
                  checked={settings.notificationsEnabled}
                  disabled={!loaded}
                  onChange={handleNotificationMasterToggle}
                />
              </div>
            </div>

            {settings.notificationsEnabled && (
              <NotificationSettings
                masterEnabled={settings.notificationsEnabled}
                onPermissionGranted={handleNotificationPermissionGranted}
              />
            )}
          </Section>

          {/* -------------------------------------------------------------- */}
          {/* QAZO PLAN                                                      */}
          {/* -------------------------------------------------------------- */}

          <Section>
            <SettingRow
              icon={<Calendar />}
              title="Qazo rejasi"
              description="Qazo namozlaringiz bo‘yicha rejangizni sozlang"
              onClick={() => {
                window.location.hash = "#/qazo-plan";
              }}
            >
              <ChevronRight size={20} />
            </SettingRow>
          </Section>

          {/* -------------------------------------------------------------- */}
          {/* QAZO CALCULATION                                               */}
          {/* -------------------------------------------------------------- */}

          <Section>
            <SettingRow
              icon={<Calculator />}
              title="Hisob-kitob"
              description="Qazo hisob-kitobini ko‘rib chiqish va sozlash"
              onClick={() => {
                window.location.hash = "#/qazo-result";
              }}
            >
              <ChevronRight size={20} />
            </SettingRow>
          </Section>

          {/* -------------------------------------------------------------- */}
          {/* REGION                                                         */}
          {/* -------------------------------------------------------------- */}

          <Section>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                  <MapIcon size={22} />
                </div>

                <div className="space-y-0.5 pt-0.5">
                  <h3 className="font-semibold text-base sm:text-lg text-green-800 tracking-tight">
                    Hudud
                  </h3>
                  <p className="text-green-400 text-xs sm:text-sm leading-tight">
                    Namoz vaqtlari uchun hududni tanlang
                  </p>
                </div>
              </div>

              <div className="relative w-full">
                <select
                  value={settings.region || DEFAULT_REGION}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  disabled={!loaded || regionSaving}
                  className="
          appearance-none
          w-full
          px-4
          py-3
          rounded-xl
          border
          border-cream-200
          bg-cream-50
          text-green-800
          text-sm
          font-medium
          focus:outline-none
          focus:border-green-400
          transition-colors
          cursor-pointer
          disabled:opacity-60
        "
                >
                  {REGIONS.map((region) => (
                    <option key={region.slug} value={region.slug}>
                      {region.name}
                    </option>
                  ))}
                </select>

                {/* Select ichidagi o'ng burchakdagi Chevron o'qchasi */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-green-700">
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>
          </Section>

          {/* -------------------------------------------------------------- */}
          {/* LANGUAGE                                                        */}
          {/* -------------------------------------------------------------- */}

          <Section>
            <div className="p-4 sm:p-5 space-y-4">
              {/* Ikonka, sarlavha va tavsif bloki */}
              <div className="flex items-start gap-4">
                {/* Yumaloq yashil fondagi Globe ikonkachasi */}
                <div className="w-11 h-11 rounded-full bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                  <Globe size={22} />
                </div>

                <div className="space-y-0.5 pt-0.5 text-left">
                  <h3 className="font-semibold text-base sm:text-lg text-green-800 tracking-tight">
                    Til
                  </h3>
                  <p className="text-green-400 text-xs sm:text-sm leading-tight">
                    Ilova tilini tanlang
                  </p>
                </div>
              </div>

              {/* Tanlov oynasi (Select) — to'liq kenglikda (w-full) va to'g'ri masofalarda */}
              <div className="relative w-full">
                <select
                  value={settings.language || "uz"}
                  onChange={(e) => updateSetting("language", e.target.value)}
                  className="
          appearance-none
          w-full
          px-4
          py-3
          rounded-xl
          border
          border-cream-200
          bg-cream-50
          text-green-800
          text-sm
          font-medium
          focus:outline-none
          focus:border-green-400
          transition-colors
          cursor-pointer
        "
                >
                  <option value="uz">O‘zbekcha</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>

                {/* Select ichidagi o'ng burchakdagi Chevron o'qchasi (o'lchami Hududniki kabi 18) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-green-700">
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* FOOTER                                                          */}
        {/* ---------------------------------------------------------------- */}

        <div
          className="
            mt-5
            rounded-2xl
            border
            border-cream-200
            bg-gradient-to-br
            from-green-50
            to-cream-50
            px-5
            py-4
            text-center
          "
        >
          <p
            className="
              text-xs
              sm:text-sm
              text-green-500
              leading-relaxed
              max-w-xl
              mx-auto
            "
          >
            Namaz Nazorati — musulmonlarga namozlarini muntazam ado etishda
            yordam beruvchi ilova.
          </p>
        </div>
      </main>
    </div>
  );
}
