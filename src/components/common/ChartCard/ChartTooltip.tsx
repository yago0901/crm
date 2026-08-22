interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; color?: string }[];
  formatValue?: (value: number) => string;
}

export default function ChartTooltip({
  active,
  label,
  payload,
  formatValue = (value) => String(value),
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="chart_tooltip">
      {label && <strong>{label}</strong>}
      <ul>
        {payload.map((entry) => (
          <li key={entry.name}>
            <span
              className="chart_tooltip__dot"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}: {formatValue(entry.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
