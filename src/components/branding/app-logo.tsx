import Image from "next/image";
import clsx from "clsx";

type AppLogoProps = {
  variant?: "compact" | "full";
  priority?: boolean;
  className?: string;
};

export function AppLogo({
  variant = "full",
  priority = false,
  className,
}: AppLogoProps) {
  if (variant === "compact") {
    return (
      <div
        className={clsx(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border",
          className
        )}
      >
        <Image
          src="/ruthva-logo.png"
          alt="Ruthva"
          width={24}
          height={24}
          priority={priority}
          className="h-6 w-6 object-contain object-left"
        />
      </div>
    );
  }

  return (
    <Image
      src="/ruthva-logo.png"
      alt="Ruthva"
      width={139}
      height={29}
      priority={priority}
      className={clsx("h-7 w-auto object-contain", className)}
    />
  );
}
