import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2.5"
      aria-label="CrackedCourse"
    >
      <CrackedCourseIcon className="size-10 shrink-0" />
      <span
        className={cn(
          "text-navy tracking-[-0.035em]",
          compact ? "text-base font-bold" : "text-lg font-extrabold",
        )}
      >
        CrackedCourse
      </span>
    </span>
  );
}

function CrackedCourseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5.5 31.5C15.5 29.7 24.4 32 32 38.1V56.2C24.4 51.3 15.6 49.8 5.5 51.4V31.5Z"
        fill="#219ebc"
        stroke="#023047"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M58.5 31.5C48.5 29.7 39.6 32 32 38.1V56.2C39.6 51.3 48.4 49.8 58.5 51.4V31.5Z"
        fill="#219ebc"
        stroke="#023047"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M8.5 26.7C17.2 25 24.8 27.3 32 33.7V54.2C25.1 48.8 17.3 47.1 8.5 48.5V26.7Z"
        fill="#8ecae6"
        stroke="#023047"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M55.5 26.7C46.8 25 39.2 27.3 32 33.7V54.2C38.9 48.8 46.7 47.1 55.5 48.5V26.7Z"
        fill="#8ecae6"
        stroke="#023047"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M32 6.2C33.3 15.5 38.5 20.7 47.8 22C38.5 23.3 33.3 28.5 32 37.8C30.7 28.5 25.5 23.3 16.2 22C25.5 20.7 30.7 15.5 32 6.2Z"
        fill="#ffb703"
        stroke="#023047"
        strokeLinejoin="round"
        strokeWidth="3.8"
      />
      <path
        d="M32 1.8V3.5"
        fill="none"
        stroke="#023047"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M14.7 8.3L17.5 11.1"
        fill="none"
        stroke="#023047"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
      <path
        d="M49.3 8.3L46.5 11.1"
        fill="none"
        stroke="#023047"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
    </svg>
  );
}
