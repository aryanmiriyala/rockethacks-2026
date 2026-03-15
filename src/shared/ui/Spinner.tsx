export default function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-brand-surface border-t-brand-green animate-spin"
      style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
    />
  );
}
