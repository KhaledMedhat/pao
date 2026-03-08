import { clsx, type ClassValue } from "clsx";
import { Area } from "react-easy-crop";
import { sileo } from "sileo";
import { twMerge } from "tailwind-merge";
import { getCookie } from "~/app/actions";
import { OBSSESSION_PROMPTS } from "~/constants/constants";
import { Channel, ChannelType } from "~/interfaces/channels.interface";
import { FriendInterface, FriendInterfaceWithFriendIds, User } from "~/interfaces/user.interface";
import { setUserLoggingInStatus } from "~/redux/slices/user/user-slice";
import { store } from "~/redux/store";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the label of a channel type
 * @param channelType - The channel type to get the label of
 * @returns The label of the channel type
 */
export function getChannelTypeLabel(channelType: ChannelType | undefined) {
  switch (channelType) {
    case ChannelType.Direct:
      return "Direct Message";
    case ChannelType.Group:
      return "Group";
    case ChannelType.Server:
      return "Server";
    default:
      return "Unknown";
  }
}

/**
 * Compare the temp user token with the query param for the completion of the signup process if its with google signup
 * @param queryParam - The query param to compare
 * @returns True if the tokens match, false otherwise
 */
export async function tempTokenCompare(queryParam: string) {
  const token = await getCookie("temp_user_token");
  if (token === queryParam) {
    return true;
  }
  return false;
}

/**
 * Sync auth state on client-side based on access_token cookie
 * Call this in a client component (e.g., layout or auth provider) on mount
 */
export async function syncAuthState() {
  const token = await getCookie("access_token");
  store.dispatch(setUserLoggingInStatus(!!token));
}

/**
 * Get the initials fallback of a name
 * @param name - The name to get the initials fallback of
 * @returns The initials fallback of the name
 */
export function getInitialsFallback(name?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      // If there's a space, treat as first and last name
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    // If single name, return first letter or first two letters
    return parts[0].slice(0, 2).toUpperCase();
  }
}

/**
 * Create a channel name from an array of display names
 * Example: ["John", "Jane", "Jim"] -> "John's, Jane's, Jim's Group"
 * @param membersDisplayNames - The array of display names to create the channel name from
 * @returns The channel name
 */
export function createChannelName(membersDisplayNames: string[]) {
  return [...membersDisplayNames.map((displayName) => displayName + "'s")].join(",") + " Group";
}

/**
 * Get the other member of a direct message channel
 * @param channel - The channel to get the other member of
 * @param currentUserId - The current user's ID
 * @returns The other member of the direct message channel
 */
export function getDirectMessageChannelOtherMember(channel: Channel, currentUserId: string) {
  const otherMembers = channel.members.filter((member) => member._id !== currentUserId);
  return otherMembers[0];
}

/**
 * Extract a direct channel from the current channels by the current user's ID and the friend's ID
 * @param currentUserId - The current user's ID
 * @param currentChannels - The current channels
 * @param friendId - The friend's ID
 * @returns The direct channel
 */
export function extractDirectChannelFromMembers(currentUserId: string, currentChannels: Channel[], friendId: string) {
  const directChannel = currentChannels.find(
    (channel) =>
      channel.type === ChannelType.Direct &&
      channel.members.some((member) => member._id === currentUserId) &&
      channel.members.some((member) => member._id === friendId)
  );
  return directChannel;
}

/**
 * Get the mutual friends of the current user and the friend
 * @param currentUser - The current user
 * @param friend - The friend
 * @returns The mutual friends of the current user and the friend
 */
export function getMutualFriends(currentUser: User, friend: FriendInterfaceWithFriendIds) {
  return currentUser.friends.filter((f) => friend.friends.some((f2) => f2 === f._id));
}

/**
 * Get the mutual servers of the current user and the friend
 * @param currentUserChannels - The current user's channels
 * @param friend - The friend
 * @returns The mutual servers of the current user and the friend
 */
export function getMutualServers(currentUserChannels: Channel[], friend: FriendInterface | undefined) {
  return currentUserChannels.filter((c) => c.type === ChannelType.Server && c.members.some((m) => m._id === friend?._id));
}

/**
 * Check if the current user is a friend of the friend
 * @param currentUser - The current user
 * @param friend - The friend
 * @returns True if the current user is a friend of the friend, false otherwise
 */
export function isTheUserFriend(currentUser: User, friendId: string) {
  return currentUser.friends.some((f) =>
    typeof f === "string" ? f === friendId : f._id === friendId
  );
}

/**
 * Create a cropped image from a source image, cropped area, and rotation
 * @param imageSrc - The source image URL
 * @param croppedAreaPixels - The cropped area pixels
 * @param rotation - The rotation angle in degrees (default: 0)
 * @returns The cropped image file
 */
export const createCroppedImage = async (imageSrc: string, croppedAreaPixels: Area, rotation = 0): Promise<File> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Calculate the bounding box of the rotated image
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedWidth = image.width * cos + image.height * sin;
  const rotatedHeight = image.width * sin + image.height * cos;

  // Create a temporary canvas for the rotated image
  const rotatedCanvas = document.createElement("canvas");
  const rotatedCtx = rotatedCanvas.getContext("2d");

  if (!rotatedCtx) {
    throw new Error("Could not get rotated canvas context");
  }

  rotatedCanvas.width = rotatedWidth;
  rotatedCanvas.height = rotatedHeight;

  // Rotate around the center
  rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotatedCtx.rotate(radians);
  rotatedCtx.translate(-image.width / 2, -image.height / 2);
  rotatedCtx.drawImage(image, 0, 0);

  // Now crop from the rotated image
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  ctx.drawImage(
    rotatedCanvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });
        resolve(file);
      }
    }, "image/jpeg");
  });
};


/**
 * Format a date string to a specific format
 * @param dateString - The date string to format
 * @param formateType - The format type to use
 * @returns The formatted date string
 */
export function formatDate(dateString: string | undefined, formateType: "lg" | "sm" | "md") {
  const date = new Date(dateString || "");

  const dateFormatted = date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatted = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const fullTimeFormatted = date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (formateType === "lg") {
    return `${fullTimeFormatted} ${timeFormatted}`;
  }
  if (formateType === "md") {
    return `${dateFormatted} ${timeFormatted}`;
  }
  if (formateType === "sm") {
    return `${timeFormatted}`;
  }
}



interface ScrollToMessageOptions {
  /** Optional scroll container element. If not provided, will find via closest() */
  scrollContainer?: HTMLElement | null;
  /** Optional callback for loading older messages when target not found */
  onScrollToMessage?: (targetId: string) => void;
}

/**
 * Scroll to a message by ID with smooth animation and highlight effect.
 * Can be used standalone or with the useScrollToMessage hook callback.
 * @param targetId - The message ID to scroll to
 * @param options - Optional configuration (scrollContainer, onScrollToMessage callback)
 */
export const scrollToMessage = (
  targetId: string | undefined,
  options?: ScrollToMessageOptions | ((targetId: string) => void)
) => {
  if (!targetId) return;

  // Support both callback-only and options object signatures
  const opts: ScrollToMessageOptions = typeof options === "function"
    ? { onScrollToMessage: options }
    : options ?? {};

  // Use the callback if provided (handles loading older messages)
  if (opts.onScrollToMessage) {
    opts.onScrollToMessage(targetId);
    return;
  }

  // Direct scroll if element exists
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    // Use provided container or find via closest()
    const scrollContainer = opts.scrollContainer
      ?? targetElement.closest('[data-radix-scroll-area-viewport]') as HTMLElement;

    if (scrollContainer) {
      // Calculate position within scroll container
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const offsetTop = targetRect.top - containerRect.top + scrollContainer.scrollTop;
      const centerOffset = (containerRect.height - targetRect.height) / 2;

      scrollContainer.scrollTo({
        top: offsetTop - centerOffset,
        behavior: "smooth"
      });
    } else {
      // Fallback to default scrollIntoView
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    window.history.pushState(null, "", `#${targetId}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
};


/**
 * Handle copying text to clipboard
 * @param text - The text to copy
 */
export const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    sileo.success({
      title: "Copied to clipboard",
    });
  } catch {
    sileo.error({
      title: "Failed to copy",
    });
  }
};


/**
 * Download a file from a URL
 * @param url - The URL of the file to download
 * @param filename - The filename of the file to download
 */
export async function downloadFile(url: string, filename?: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Create a temporary link element
    const link = document.createElement("a");
    link.href = blobUrl;

    // Set the download filename
    if (filename) {
      link.download = filename;
    } else {
      // Try to get filename from Content-Disposition header
      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          link.download = filenameMatch[1].replace(/['"]/g, "");
        }
      } else {
        // Extract filename from URL if no Content-Disposition
        link.download = url.substring(url.lastIndexOf("/") + 1);
      }
    }

    // Trigger the download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}


/**
 * Format bytes to a human readable format
 * @param bytes - The bytes to format
 * @param decimals - The number of decimals to show
 * @returns The formatted bytes
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i]
}




/**
 * Generate a random obsession prompt
 * @param setPrompt - The function to set the prompt
 * @param usedIndexes - The used indexes
 * @returns The random obsession prompt
 */
export function generateRandomObsessionPrompt(setPrompt: (value: string) => void, usedIndexes: React.RefObject<Set<number>>) {
  if (usedIndexes.current.size === OBSSESSION_PROMPTS.length) {
    usedIndexes.current.clear(); // Reset when all prompts are used
  }

  let index: number;
  do {
    index = Math.floor(Math.random() * OBSSESSION_PROMPTS.length);
  } while (usedIndexes.current.has(index));

  usedIndexes.current.add(index);
  setPrompt(OBSSESSION_PROMPTS[index]);
}