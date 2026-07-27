const tones = [
  "bg-sage text-moss",
  "bg-mist text-sky-700",
  "bg-blush text-orange-700",
  "bg-gold/30 text-yellow-800"
];

type AvatarProps = {
  initials: string;
  size?: "sm" | "md" | "lg";
  toneIndex?: number;
};

const sizes = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-lg"
};

export function Avatar({ initials, size = "md", toneIndex = 0 }: AvatarProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${tones[toneIndex % tones.length]}`}
    >
      {initials}
    </span>
  );
}
