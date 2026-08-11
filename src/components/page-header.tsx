export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-bold tracking-[0.13em] text-[#13738a] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-navy text-3xl font-extrabold tracking-[-0.045em] text-balance sm:text-[2.15rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
