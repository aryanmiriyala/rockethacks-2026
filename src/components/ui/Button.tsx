import { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "destructive";
}

export default function Button({ variant = "primary", className = "", children, ...props }: Props) {
  const base = "rounded-xl py-3 px-5 font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-brand-green text-brand-dark hover:opacity-90",
    ghost: "bg-brand-surface text-white border border-white/10 hover:bg-white/5",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
