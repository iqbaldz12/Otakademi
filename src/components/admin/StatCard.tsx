import { Icon, type IconName } from "@/components/ui/Icon";

/** Dashboard KPI tile. Server component. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "navy",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
  tone?: "navy" | "gold" | "coral" | "green";
}) {
  const toneClass = {
    navy: "text-navy-900",
    gold: "text-gold-700",
    coral: "text-coral-600",
    green: "text-emerald-600",
  }[tone];

  const iconBg = {
    navy: "bg-navy-50 text-navy-500",
    gold: "bg-gold-50 text-gold-700",
    coral: "bg-coral-50 text-coral-600",
    green: "bg-emerald-50 text-emerald-600",
  }[tone];

  return (
    <div className="card card-interactive p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-navy-400">{label}</p>
          <p className={`mt-1 text-2xl font-extrabold tnum sm:text-[1.75rem] ${toneClass}`}>
            {value}
          </p>
          {hint && <p className="mt-0.5 truncate text-[0.7rem] text-navy-400">{hint}</p>}
        </div>
        {icon && (
          <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon name={icon} size={18} />
          </span>
        )}
      </div>
    </div>
  );
}
