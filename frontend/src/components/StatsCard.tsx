interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
}

const StatsCard = ({ title, value, description }: StatsCardProps) => {
  return (
    <div className="border border-border bg-card p-8 space-y-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {title}
      </p>
      <p className="text-4xl font-semibold">{value}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default StatsCard;
