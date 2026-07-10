type Props = {
  tips?: string[];
};

export function TrainerFitsYouBlock({ tips }: Props) {
  if (!tips?.length) return null;

  return (
    <div
      style={{
        background: "rgba(201,168,76,0.06)",
        border: "0.5px solid rgba(201,168,76,0.15)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <p style={{ color: "#C9A84C", fontSize: 12, marginBottom: 6 }}>
        Подходит тебе, если:
      </p>
      {tips.map((tip, i) => (
        <p key={i} style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
          — {tip}
        </p>
      ))}
    </div>
  );
}
