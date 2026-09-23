import Button from "../ui/Button";
import { ONBOARDING_TERMS } from "../../constants/onboarding";
import { Clock3 } from "lucide-react";

export default function WelcomeStep({ onStart }) {
  return (
    <div className="flex flex-col items-center text-center animate-fade-in min-h-[60vh] justify-center">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center mb-8 shadow-deep">
        <Clock3 size={52} color="white" />
      </div>

      <h1 className="text-4xl font-bold text-green-700 mb-4 font-serif">
        {ONBOARDING_TERMS.welcomeTitle}
      </h1>

      <p className="text-green-500 text-base leading-relaxed max-w-sm mb-10">
        {ONBOARDING_TERMS.welcomeSubtitle}
      </p>

      <div className="w-full max-w-xs space-y-3">
        <Button variant="primary" size="lg" fullWidth onClick={onStart}>
          {ONBOARDING_TERMS.startButton}
        </Button>
      </div>
    </div>
  );
}
