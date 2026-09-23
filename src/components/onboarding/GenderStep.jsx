import StepWrapper from "./StepWrapper";
import { GENDER_OPTIONS, ONBOARDING_TERMS } from "../../constants/onboarding";

const GENDER_ICONS = {
  male: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 508.61 508.61"
      width="36"
      height="36"
    >
      <circle cx="163.942" cy="159.364" r="36.959" />
      <circle cx="344.328" cy="159.364" r="36.959" />
      <circle cx="254.135" cy="115.285" r="115.285" />
      <path d="M338.564,284.821H169.706c-77.309,0-140.037,62.728-140.037,140.037v83.751H478.94v-83.751c-.339-77.308-63.067-140.037-140.376-140.037z" />
      <circle cx="254.135" cy="271.936" r="62.728" />
      <path d="M330.766,74.257c-10.172,17.971-40.689,31.195-76.63,31.195s-66.458-13.224-76.63-31.195c-11.189,15.597-17.632,34.585-17.632,54.93v69.171c0,52.217,42.384,94.262,94.262,94.262s94.262-42.384,94.262-94.262v-68.832c0-20.345-6.442-39.333-17.631-54.93z" />
      <path
        fill="#F1F3F7"
        d="M369.081,106.469C364.334,46.792,314.829,0,254.135,0S143.936,46.792,139.189,106.469H369.081z"
      />
    </svg>
  ),
  female: (
    <svg xmlns="http://w3.org" viewBox="0 0 128 128" width="36" height="36">
      <path
        d="M64.13 94.45H64c-25.65.03-51.46 7.55-51.46 25.44v4.07h102.93v-4.07c-.01-16.87-25.57-25.44-51.34-25.44z"
        fill="#000000"
      />
      <path
        d="M63.82 94.45c-2.38 0-5.07-.52-7.81-1.48c-11.72-4.14-25.39-16.89-25.39-39.16c0-29.68 17.89-40.21 33.21-40.21s33.21 10.53 33.21 40.21c0 22.3-13.7 35.03-25.43 39.17c-2.75.96-5.43 1.47-7.79 1.47z"
        fill="#FFFFFF"
        stroke="#000000"
        stroke-width="2"
      />
      <g fill="#000000">
        <path
          d="M24.5 108.51c.96 7.03 5.72 12.21 13.67 15.45h43.06c29.16-15.63 24.38-71.5 23.99-76.45C103.36 23.55 92.06 4.01 64.03 4C35.99 4.01 23 23.68 23 47.17c0 21.99 4.06 37.42 10.97 47.5c-6.38 2.8-10.22 8.34-9.47 13.84zm39.53-71.82s25.76 12.63 29.89 31.25c0 0-8.89 24.4-29.89 24.4s-29.89-24.4-29.89-24.4c3.55-18.74 29.89-31.25 29.89-31.25z"
          opacity="0.15"
        />
        <path d="M32.85 98.13s.47 12.25 14.16 18.94c17.53 8.57 33.59.78 40.69-7.18c9.93-11.14 9.35-30.83 9.35-30.83s-1.34 19.51-15.75 29.63c-10.11 7.1-22.17 8.03-32.99 3.75c-13.49-5.33-15.46-14.31-15.46-14.31z" />
        <path d="M46.77 100.28c-12.6-4.18-21.23-26.71-21.23-26.71s4.52 32.34 29.65 36.64c31.49 5.38 46.15-27.46 48.76-39.72c6.4-35.65-8.89-52.95-8.89-52.95s14.16 29.28 3.6 54.96c-6 14.62-18.61 38.83-51.89 27.78z" />
        <path
          d="M65.59 16.43S51.34 12 38.34 26c-12.47 13.43-8.58 39.09-8.58 39.09s-.14-21.42 14.58-35.42c12.87-12.25 21.25-13.24 21.25-13.24z"
          opacity="0.3"
        />
        <path d="M88.23 38.05c9.86 13.59 9.05 31.86 9.05 31.86s5.17-20.84-4.83-34.76c-7.88-10.97-20.64-11.41-20.64-11.41s7.15 1.53 16.42 14.31z" />
        <path d="M43.83 87.6c16.09 12.82 34.91 6.88 34.91 6.88s-20.9 11.66-38.14-3.77c-10.08-9.02-10.45-24.07-10.45-24.07s3.88 13.14 13.68 20.96z" />
      </g>
    </svg>
  ),
};

export default function GenderStep({ value, onSelect }) {
  return (
    <StepWrapper title={ONBOARDING_TERMS.genderTitle}>
      <div className="w-full max-w-sm space-y-3">
        {GENDER_OPTIONS.map((option) => {
          const selected = value === option.key;
          return (
            <button
              key={option.key}
              onClick={() => onSelect(option.key)}
              className={`
                w-full flex items-center gap-4 px-6 py-5 rounded-card transition-all duration-200
                ${
                  selected
                    ? "bg-green-600 text-cream-50 shadow-deep scale-[1.02]"
                    : "bg-cream-50 text-green-600 shadow-card hover:shadow-deep active:scale-[0.98]"
                }
              `}
            >
              <div
                className={`shrink-0 ${selected ? "text-cream-50" : "text-green-400"}`}
              >
                {GENDER_ICONS[option.icon]}
              </div>
              <span className="text-lg font-semibold flex-1 text-left">
                {option.label}
              </span>
              {selected && (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </StepWrapper>
  );
}
