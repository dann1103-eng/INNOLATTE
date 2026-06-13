import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-6",
        className,
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-muted mt-1 max-w-sm">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
