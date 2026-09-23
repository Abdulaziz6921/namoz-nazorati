import { useState, useEffect } from "react";
import {
  ONBOARDING_STEPS,
  STEP_ORDER,
  ONBOARDING_TERMS,
} from "../constants/onboarding";
import { DEFAULT_REGION } from "../constants/regions";
import { setStoredRegion } from "../lib/prayerTimesService";
import { completeOnboarding } from "../lib/profileService";
import { calculateAccountabilityDate } from "../lib/accountability";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StepProgress from "../components/onboarding/StepProgress";
import WelcomeStep from "../components/onboarding/WelcomeStep";
import GenderStep from "../components/onboarding/GenderStep";
import BirthDateStep from "../components/onboarding/BirthDateStep";
import PrayerStartStep from "../components/onboarding/PrayerStartStep";
import MenstruationStep from "../components/onboarding/MenstruationStep";
import ReviewStep from "../components/onboarding/ReviewStep";

export default function OnboardingPage({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const [profile, setProfile] = useState({
    gender: null,
    birthDate: null,
    accountabilityDate: null,
    regularPrayerStartDate: null,
    regularPrayerStartType: null,
    consistencyEstimate: null,
    menstruationDays: null,
    customMenstruationDays: null,
  });

  const currentStep = STEP_ORDER[stepIndex];

  function updateProfile(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function nextStep() {
    if (stepIndex < STEP_ORDER.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }

  function prevStep() {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  }

  function goToStep(stepName) {
    const idx = STEP_ORDER.indexOf(stepName);
    if (idx >= 0) setStepIndex(idx);
  }

  function canProceed() {
    switch (currentStep) {
      case ONBOARDING_STEPS.GENDER:
        return !!profile.gender;
      case ONBOARDING_STEPS.BIRTH_DATE:
        return !!profile.birthDate;
      case ONBOARDING_STEPS.PRAYER_START:
        if (!profile.regularPrayerStartType) return false;
        if (
          profile.regularPrayerStartType !== "unknown" &&
          !profile.regularPrayerStartDate
        )
          return false;
        if (!profile.consistencyEstimate) return false;
        return true;
      case ONBOARDING_STEPS.MENSTRUATION:
        if (!profile.menstruationDays) return false;
        if (
          profile.menstruationDays === "custom" &&
          !profile.customMenstruationDays
        )
          return false;
        return true;
      default:
        return true;
    }
  }

  async function handleFinish() {
    setSaving(true);
    setError(false);
    try {
      const accountabilityDate =
        profile.accountabilityDate ||
        (profile.birthDate && profile.gender
          ? calculateAccountabilityDate(
              profile.birthDate,
              profile.gender,
            ).toISOString()
          : null);

      let menstruationDaysValue = null;
      if (profile.gender === "female") {
        if (profile.menstruationDays === "custom") {
          menstruationDaysValue = profile.customMenstruationDays;
        } else {
          const num = parseInt(profile.menstruationDays, 10);
          if (!isNaN(num)) menstruationDaysValue = num;
        }
      }

      await completeOnboarding({
        gender: profile.gender,
        birthDate: profile.birthDate,
        accountabilityDate,
        regularPrayerStartDate: profile.regularPrayerStartDate,
        regularPrayerStartType: profile.regularPrayerStartType,
        consistencyEstimate: profile.consistencyEstimate,
        menstruationDays: menstruationDaysValue,
        onboardingCompleted: true,
        language: "uz",
        notificationPreferences: {
          notificationsEnabled: false,
        },
      });

      // Save default region for prayer times and notifications
      await setStoredRegion(DEFAULT_REGION);
      onComplete();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (saving) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Spinner label="Saqlanmoqda..." size={48} />
      </div>
    );
  }

  if (currentStep === ONBOARDING_STEPS.WELCOME) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f7f4ed] to-[#f1eee6] flex flex-col items-center justify-center px-6 py-10">
        <WelcomeStep onStart={nextStep} onLater={onComplete} />
      </div>
    );
  }

  const showMenstruation = profile.gender === "female";
  const dataSteps = STEP_ORDER.filter((s) => s !== ONBOARDING_STEPS.WELCOME);
  const currentDataIdx = dataSteps.indexOf(currentStep);
  const totalDataSteps = showMenstruation
    ? dataSteps.length
    : dataSteps.length - 1;

  function handleNext() {
    if (currentStep === ONBOARDING_STEPS.REVIEW) {
      handleFinish();
    } else if (
      currentStep === ONBOARDING_STEPS.PRAYER_START &&
      !showMenstruation
    ) {
      setStepIndex(STEP_ORDER.indexOf(ONBOARDING_STEPS.REVIEW));
    } else {
      nextStep();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f4ed] to-[#f1eee6] flex flex-col px-6 py-8 lg:items-center">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-6">
          <StepProgress current={currentDataIdx} total={totalDataSteps} />
        </div>

        <div
          className="flex-1 flex flex-col justify-center min-h-[50vh] animate-slide-up"
          key={currentStep}
        >
          {currentStep === ONBOARDING_STEPS.GENDER && (
            <GenderStep
              value={profile.gender}
              onSelect={(v) => updateProfile("gender", v)}
            />
          )}

          {currentStep === ONBOARDING_STEPS.BIRTH_DATE && (
            <BirthDateStep
              value={profile.birthDate}
              onChange={(v) => updateProfile("birthDate", v)}
              gender={profile.gender}
              accountabilityDate={profile.accountabilityDate}
              onAccountabilityDateChange={(v) =>
                updateProfile("accountabilityDate", v)
              }
            />
          )}

          {currentStep === ONBOARDING_STEPS.PRAYER_START && (
            <PrayerStartStep
              startType={profile.regularPrayerStartType}
              onStartTypeChange={(v) =>
                updateProfile("regularPrayerStartType", v)
              }
              startDate={profile.regularPrayerStartDate}
              onStartDateChange={(v) =>
                updateProfile("regularPrayerStartDate", v)
              }
              consistency={profile.consistencyEstimate}
              onConsistencyChange={(v) =>
                updateProfile("consistencyEstimate", v)
              }
            />
          )}

          {currentStep === ONBOARDING_STEPS.MENSTRUATION &&
            showMenstruation && (
              <MenstruationStep
                value={profile.menstruationDays}
                onChange={(v) => updateProfile("menstruationDays", v)}
                customDays={profile.customMenstruationDays}
                onCustomDaysChange={(v) =>
                  updateProfile("customMenstruationDays", v)
                }
              />
            )}

          {currentStep === ONBOARDING_STEPS.REVIEW && (
            <ReviewStep profile={profile} onEdit={goToStep} />
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mt-4">
            Saqlashda xatolik yuz berdi. Qayta urinib ko'ring.
          </p>
        )}

        <div className="flex items-center gap-3 mt-8 pb-4">
          <Button variant="ghost" size="md" onClick={prevStep}>
            {ONBOARDING_TERMS.backButton}
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === ONBOARDING_STEPS.REVIEW
              ? ONBOARDING_TERMS.finishButton
              : ONBOARDING_TERMS.nextButton}
          </Button>
        </div>
      </div>
    </div>
  );
}
