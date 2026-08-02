interface ProjectionWindowSelectorProps {
  value: 30 | 60 | 90;
  onChange: (days: 30 | 60 | 90) => void;
}

const windows: Array<{ days: 30 | 60 | 90; label: string }> = [
  { days: 30, label: "30 Days" },
  { days: 60, label: "60 Days" },
  { days: 90, label: "90 Days" },
];

export function ProjectionWindowSelector({
  value,
  onChange,
}: ProjectionWindowSelectorProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
      role="group"
      aria-label="Projection window"
    >
      {windows.map(({ days, label }) => {
        const isActive = value === days;
        return (
          <button
            key={days}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`${days} day projection`}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => onChange(days)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
