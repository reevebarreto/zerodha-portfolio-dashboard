interface Props {
  score: number;
  max: number;
  label: string;
  value: string; // formatted value string e.g. "18.4%"
}

export function CriteriaSquare({ score, max, label, value }: Props) {
  const pct = score / max;
  const color = pct >= 0.75 ? "#639922" : pct >= 0.5 ? "#BA7517" : "#E24B4A";

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      className="criteria-square-wrap"
    >
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          borderRadius: 3,
          background: color,
          cursor: "default",
        }}
      />
      <span className="criteria-tooltip">
        <strong>{label}</strong>
        <br />
        {value}
      </span>
    </span>
  );
}

// Made with Bob
