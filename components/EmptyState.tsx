import { UiIcon, type IconName } from "@/components/UiIcon";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mist text-ink/40">
        <UiIcon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-6 text-ink/55">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
