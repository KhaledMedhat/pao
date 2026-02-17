"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { IconMinus, IconMoon } from "@tabler/icons-react"

import { cn } from "~/lib/utils"
import { StatusType } from "~/interfaces/user.interface"

function Avatar({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 overflow-visible rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full overflow-hidden rounded-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center overflow-hidden rounded-full text-sm group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

const statusBadgeStyles: Record<
  StatusType,
  { bg: string; icon?: React.ReactNode }
> = {
  [StatusType.Online]: { bg: "bg-green-500" },
  [StatusType.Invisible]: { bg: "bg-main border-4 border-muted-foreground/40" },
  [StatusType.DoNotDisturb]: {
    bg: "bg-red-500 text-primary-foreground",
    icon: <IconMinus className="size-full p-0.5" strokeWidth={4} />,
  },
  [StatusType.Idle]: {
    bg: "bg-main",
    icon: <IconMoon className="size-full text-yellow-500 fill-yellow-500" />,
  },
}

function AvatarBadge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & { variant?: StatusType }) {
  const style = variant !== undefined ? statusBadgeStyles[variant] : null
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "ring-main absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full ring-2 select-none overflow-hidden",
        style ? style.bg : "bg-main text-primary-foreground",
        className
      )}
      {...props}
    >
      {variant !== undefined && style?.icon ? style.icon : props.children}
    </span>
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "*:data-[slot=avatar]:ring-background group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "bg-muted text-muted-foreground ring-background relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
}
