export default function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full border-2 border-brand-surface border-t-brand-green animate-spin`}
    />
  );
}
