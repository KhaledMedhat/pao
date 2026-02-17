import { StatusType } from "~/interfaces/user.interface";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn, getInitialsFallback } from "~/lib/utils";
import { cva } from "class-variance-authority";
import { IconMinus, IconMoon } from "@tabler/icons-react";

const avatarVariants = cva("relative inline-block", {
  variants: {
    size: {
      default: "size-10",
      md: "size-8",
      sm: "size-6.5",
      lg: "size-20",
      xl: "size-30",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const indicatorVariants = cva("absolute bottom-0 -right-1 rounded-full border-2 border-background flex items-center justify-center", {
  variants: {
    size: {
      default: "size-4.5",
      md: "size-4",
      sm: "size-3.5",
      lg: "size-6 right-0 bottom-1",
      xl: "size-10",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const statusBadgeVariants = cva("", {
  variants: {
    size: {
      default: "size-5",
      md: "size-3.5",
      sm: "size-3.5",
      lg: "size-6",
      xl: "size-10",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

function StatusBadge({ status, size }: { status: StatusType; size: "default" | "sm" | "lg" | "md" | "xl" }) {
  switch (status) {
    case StatusType.Online:
      return <span className={indicatorVariants({ size, className: "bg-green-500" })} />;
    case StatusType.Invisible:
      return <span className={indicatorVariants({ size, className: "bg-background border-gray-400" })} />;
    case StatusType.DoNotDisturb:
      return (
        <span className={indicatorVariants({ size, className: "bg-red-500" })}>
          <IconMinus className={statusBadgeVariants({ size, className: "text-background" })} strokeWidth={4} />
        </span>
      );
    case StatusType.Idle:
      return (
        <span className={indicatorVariants({ size, className: "bg-background" })}>
          <IconMoon className={statusBadgeVariants({ size, className: "text-background fill-yellow-500" })} />
        </span>
      );
    default:
      return null;
  }
}

const ProfileAvailabilityIndicator: React.FC<{
  className?: string;
  status?: StatusType;
  imageUrl: string;
  name: string;
  size: "default" | "sm" | "lg" | "md" | "xl";
}> = ({ className, status, imageUrl, name, size }) => {
  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className={avatarVariants({ size })}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback>{getInitialsFallback(name)}</AvatarFallback>
      </Avatar>
      {status && <StatusBadge status={status} size={size} />}
    </div>
  );
};

export default ProfileAvailabilityIndicator;
