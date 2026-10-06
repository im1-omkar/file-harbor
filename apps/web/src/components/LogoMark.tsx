interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 20, className = "" }: LogoMarkProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 76 65"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor" />
      </svg>
    </div>
  );
}
