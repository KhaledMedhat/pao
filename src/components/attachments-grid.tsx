"use client"

import { Attachment } from "~/interfaces/message.interface"
import Image from "next/image"
import { FriendInterface } from "~/interfaces/user.interface"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useState, useRef, useCallback, useEffect } from "react"

import { toast } from "sonner"
import { IconArchive, IconCopy, IconCornerUpRight, IconDots, IconDownload, IconExternalLink, IconFile, IconFileSpreadsheet, IconFileText, IconHeadphones, IconLink, IconPlayerPauseFilled, IconPlayerPlayFilled, IconX, IconZoomIn, IconZoomOut } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { downloadFile, formatBytes, formatDate, getInitialsFallback, handleCopy } from "~/lib/utils"
import ForwardMessage from "./forward-message"
import { Spinner } from "./ui/spinner";
import { SHORT_LOGO_URL } from "~/constants/constants";

interface AttachmentsGridProps {
    attachments: Attachment[]
    sender: FriendInterface | undefined
    messageSentAt: Date | undefined
    isAlert?: boolean
    messageId?: string
}

// Audio Player Component for voice messages
const PLAYBACK_SPEEDS = [1, 1.5, 2] as const
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number]

function AudioPlayer({ attachment, isAlert }: { attachment: Attachment, isAlert?: boolean }) {
    const [isLoading, setIsLoading] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
    const [audioDuration, setAudioDuration] = useState<number>(attachment.duration || 0)
    const [isSeekDragging, setIsSeekDragging] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const playbackSpeedRef = useRef<PlaybackSpeed>(1)
    const waveformContainerRef = useRef<HTMLDivElement>(null)
    const isDraggingRef = useRef(false)

    // Keep ref in sync with state
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed
    }, [playbackSpeed])

    // Generate static waveform data based on attachment
    const waveformBars = useRef<number[]>(
        Array.from({ length: isAlert ? 20 : 40 }, () => Math.random() * 0.7 + 0.3)
    ).current

    const formatDuration = (seconds: number) => {
        if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
            return "0:00"
        }
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [])

    // Animation loop controlled by isPlaying state
    useEffect(() => {
        if (!isPlaying) return

        const updateProgress = () => {
            if (audioRef.current) {
                const dur = audioDuration || audioRef.current.duration || 1
                if (isFinite(dur) && dur > 0) {
                    setProgress(audioRef.current.currentTime / dur)
                    setCurrentTime(audioRef.current.currentTime)
                }
            }
            animationFrameRef.current = requestAnimationFrame(updateProgress)
        }

        animationFrameRef.current = requestAnimationFrame(updateProgress)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
        }
    }, [isPlaying, audioDuration])

    const handlePlay = useCallback(() => {
        if (!attachment.url) {
            console.error("Audio attachment has no URL:", attachment)
            return
        }

        // If already playing, pause
        if (isPlaying && audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
            return
        }

        // If audio already loaded, just play
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed
            audioRef.current.play()
            setIsPlaying(true)
            return
        }

        // First time - load and play
        setIsLoading(true)
        const audio = new Audio()
        audio.src = attachment.url
        audioRef.current = audio

        audio.onloadedmetadata = () => {
            if (isFinite(audio.duration) && !isNaN(audio.duration)) {
                setAudioDuration(audio.duration)
            }
        }

        audio.oncanplay = () => {
            setIsLoading(false)
            audio.playbackRate = playbackSpeedRef.current
            audio.play()
            setIsPlaying(true)
        }

        audio.onerror = () => {
            console.error("Audio failed to load:", attachment.url)
            setIsLoading(false)
        }

        audio.onended = () => {
            setIsPlaying(false)
            setProgress(0)
            setCurrentTime(0)
        }

        audio.load()
    }, [attachment, isPlaying, playbackSpeed])

    const cycleSpeed = useCallback(() => {
        const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed)
        const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length
        const newSpeed = PLAYBACK_SPEEDS[nextIndex]
        setPlaybackSpeed(newSpeed)
        if (audioRef.current) {
            audioRef.current.playbackRate = newSpeed
        }
    }, [playbackSpeed])

    const getSeekPosition = useCallback((clientX: number): number | null => {
        const el = waveformContainerRef.current
        if (!el) return null
        const rect = el.getBoundingClientRect()
        const duration = audioDuration || audioRef.current?.duration
        if (!duration || !isFinite(duration) || duration <= 0) return null
        const x = clientX - rect.left
        const ratio = Math.max(0, Math.min(1, x / rect.width))
        return ratio * duration
    }, [audioDuration])

    const handleSeek = useCallback((clientX: number) => {
        const seconds = getSeekPosition(clientX)
        if (seconds == null) return
        const dur = audioDuration || audioRef.current?.duration || 1
        if (!isFinite(dur) || dur <= 0) return
        if (audioRef.current) {
            audioRef.current.currentTime = seconds
            setProgress(seconds / dur)
            setCurrentTime(seconds)
        }
    }, [getSeekPosition, audioDuration])

    const handleSeekPointerDown = useCallback((clientX: number) => {
        isDraggingRef.current = true
        setIsSeekDragging(true)
        handleSeek(clientX)
    }, [handleSeek])

    const handleSeekPointerMove = useCallback((clientX: number) => {
        if (!isDraggingRef.current) return
        handleSeek(clientX)
    }, [handleSeek])

    const handleSeekPointerUp = useCallback(() => {
        isDraggingRef.current = false
    }, [])

    useEffect(() => {
        if (!isSeekDragging) return
        const onMouseMove = (e: MouseEvent) => handleSeekPointerMove(e.clientX)
        const onMouseUp = () => {
            setIsSeekDragging(false)
            handleSeekPointerUp()
        }
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                e.preventDefault()
                handleSeekPointerMove(e.touches[0].clientX)
            }
        }
        const onTouchEnd = () => {
            setIsSeekDragging(false)
            handleSeekPointerUp()
        }
        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mouseup", onMouseUp)
        document.addEventListener("touchmove", onTouchMove, { passive: false })
        document.addEventListener("touchend", onTouchEnd)
        document.addEventListener("touchcancel", onTouchEnd)
        return () => {
            document.removeEventListener("mousemove", onMouseMove)
            document.removeEventListener("mouseup", onMouseUp)
            document.removeEventListener("touchmove", onTouchMove)
            document.removeEventListener("touchend", onTouchEnd)
            document.removeEventListener("touchcancel", onTouchEnd)
        }
    }, [isSeekDragging, handleSeekPointerMove, handleSeekPointerUp])

    return (
        <div className={`flex items-center gap-3 bg-muted/50 rounded-lg p-3 ${isAlert ? 'max-w-lg' : 'max-w-sm'}`}>
            {/* Play/Pause button with loading spinner */}
            <Button
                variant="default"
                size={isAlert ? 'xs' : 'sm'}
                type="button"
                onClick={handlePlay}
                disabled={isLoading}
            >
                {isLoading ? (
                    <div className="size-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                    <IconPlayerPauseFilled size={isAlert ? 12 : 18} />
                ) : (
                    <IconPlayerPlayFilled size={isAlert ? 12 : 18} />
                )}
            </Button>

            {/* Waveform visualization with smooth progress overlay - drag to seek */}
            <div
                ref={waveformContainerRef}
                role="slider"
                aria-label="Seek audio"
                aria-valuemin={0}
                aria-valuemax={audioDuration}
                aria-valuenow={currentTime}
                aria-valuetext={formatDuration(currentTime)}
                className="flex-1 h-8 relative cursor-pointer select-none touch-none"
                onMouseDown={(e) => {
                    e.preventDefault()
                    handleSeekPointerDown(e.clientX)
                }}
                onTouchStart={(e) => {
                    handleSeekPointerDown(e.touches[0].clientX)
                }}
                onTouchMove={(e) => {
                    if (isDraggingRef.current) {
                        e.preventDefault()
                        handleSeekPointerMove(e.touches[0].clientX)
                    }
                }}
                onTouchEnd={() => {
                    setIsSeekDragging(false)
                    handleSeekPointerUp()
                }}
                onTouchCancel={() => {
                    setIsSeekDragging(false)
                    handleSeekPointerUp()
                }}
            >
                {/* Background waveform (unplayed) */}
                <div className="absolute inset-0 flex items-center gap-0.5">
                    {waveformBars.map((level, i) => (
                        <div
                            key={i}
                            className="rounded-full flex-1 min-w-[2px] max-w-[4px] bg-muted-foreground/40"
                            style={{
                                height: `${Math.max(15, level * 100)}%`,
                            }}
                        />
                    ))}
                </div>
                {/* Foreground waveform (played) with clip mask */}
                <div
                    className="absolute inset-0 flex items-center gap-0.5"
                    style={{
                        clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
                    }}
                >
                    {waveformBars.map((level, i) => (
                        <div
                            key={i}
                            className="rounded-full flex-1 min-w-[2px] max-w-[4px] bg-accent"
                            style={{
                                height: `${Math.max(15, level * 100)}%`,
                            }}
                        />
                    ))}
                </div>
                {/* Seek thumb at playhead - visual cue that bar is draggable */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-2 border-main-foreground shadow-sm pointer-events-none z-10"
                    style={{ left: `calc(${progress * 100}% - 5px)` }}
                    aria-hidden
                />
            </div>

            {/* Duration / Current time */}
            <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 min-w-[36px] text-center">
                {isPlaying ? formatDuration(currentTime) : formatDuration(audioDuration)}
            </span>

            {/* Playback speed button */}
            <Button
                variant="secondary"
                size={isAlert ? 'xs' : 'sm'}
                type="button"
                className="shrink-0 font-semibold"
                onClick={cycleSpeed}
            >
                {playbackSpeed}x
            </Button>
        </div>
    )
}

export function AttachmentsGrid({ attachments, sender, messageSentAt, isAlert, messageId }: AttachmentsGridProps) {
    const images = attachments.filter((att) => att.type.includes("image"))
    const videos = attachments.filter((att) => att.type.includes("video"))
    const audios = attachments.filter((att) => att.type === "audio" || att.type.includes("audio/"))
    const files = attachments.filter((att) => att.type.includes("text"))
    const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
        const fileType = file.file instanceof File ? file.file.type : file.file.type
        const fileName = file.file instanceof File ? file.file.name : file.file.name

        const iconMap = {
            pdf: {
                icon: IconFileText,
                conditions: (type: string, name: string) =>
                    type.includes("pdf") ||
                    name.endsWith(".pdf") ||
                    type.includes("word") ||
                    name.endsWith(".doc") ||
                    name.endsWith(".docx"),
            },
            archive: {
                icon: IconArchive,
                conditions: (type: string, name: string) =>
                    type.includes("zip") || type.includes("archive") || name.endsWith(".zip") || name.endsWith(".rar"),
            },
            excel: {
                icon: IconFileSpreadsheet,
                conditions: (type: string, name: string) =>
                    type.includes("excel") || name.endsWith(".xls") || name.endsWith(".xlsx"),
            },
            audio: {
                icon: IconHeadphones,
                conditions: (type: string) => type.includes("audio/"),
            },
        }

        for (const { icon: Icon, conditions } of Object.values(iconMap)) {
            if (conditions(fileType, fileName)) {
                return <Icon size={24} />
            }
        }

        return <IconFile size={24} />
    }
    const [isZoomed, setIsZoomed] = useState<boolean>(false)
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
    const [isForwardOpen, setIsForwardOpen] = useState<boolean>(false)
    const [savedImageIndex, setSavedImageIndex] = useState<number | null>(null)
    const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)
    const controlButtons = [
        {
            icon: isZoomed ? IconZoomOut : IconZoomIn,
            tooltip: isZoomed ? "Zoom Out" : "Zoom In",
            onClick: () => {
                setIsZoomed(!isZoomed)
            }
        },
        {
            icon: IconCornerUpRight,
            tooltip: "Forward",
            onClick: (attachment: Attachment) => { setIsForwardOpen(true); setSelectedImageIndex(null); setSelectedAttachment(attachment) }
        },
        {
            icon: IconDownload,
            tooltip: "Download",
            onClick: (attachment: Attachment) => { downloadFile(attachment.url, attachment.name) }
        },
        {
            icon: IconExternalLink,
            tooltip: "Open In Another Tab",
            onClick: (attachment: Attachment) => { window.open(attachment.url, '_blank', 'noopener,noreferrer') }
        }
    ]

    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasDragged, setHasDragged] = useState<boolean>(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isZoomed) return;
        setIsDragging(true);
        setHasDragged(false); // Reset drag state
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !isZoomed) return;
        setHasDragged(true);
        // Only update Y position, keep X at 0
        const newY = Math.min(Math.max(e.clientY - dragStart.y, -300), 300);
        setPosition({ x: 0, y: newY }); // X is always 0
    };
    const handleMouseUp = () => {
        setIsDragging(false);
    };
    const copyImageToClipboard = async () => {
        if (!imgRef.current) return;

        const img = imgRef.current;

        // Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            try {
                // Use ClipboardItem to copy image blob
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
                toast.success('Image copied to clipboard!');
            } catch {
                toast.error('Failed to copy image.');
            }
        }, 'image/*');
    };
    return (
        <div className="space-y-2">
            {/* Images Grid */}
            {images.length > 0 && (
                <div className={`grid w-fit gap-2 pb-2 ${getGridClass(images.length)}`}>
                    {images.map((attachment, idx) => (
                        <Dialog
                            key={idx}
                            open={selectedImageIndex === idx}
                            onOpenChange={(open) => {
                                setSelectedImageIndex(open ? idx : null)
                                setSavedImageIndex(idx)
                                if (!open) {
                                    setIsZoomed(false)
                                }
                            }}
                        >
                            <DialogTrigger asChild>
                                <div
                                    onClick={(e) => (isAlert || attachment.isUploading) && e.preventDefault()}
                                    className={`relative group cursor-pointer overflow-hidden rounded-lg aspect-square ${isAlert ? 'w-[100px]' : 'w-[250px] max-w-[250px]'}`}
                                >
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={attachment.url}
                                            alt={attachment.name}
                                            fill
                                            className="object-cover transition-transform duration-200 hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                        {/* Upload loading overlay */}
                                        {attachment.isUploading && (
                                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                                <Spinner className="size-8" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogTrigger>
                            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-6xl! h-full p-0 bg-transparent outline-none border-none flex items-center justify-center">
                                <VisuallyHidden.Root>
                                    <DialogHeader>
                                        <DialogTitle></DialogTitle>
                                        <DialogDescription>
                                        </DialogDescription>
                                    </DialogHeader>
                                </VisuallyHidden.Root>
                                <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-12" style={
                                            sender?.profilePicture === SHORT_LOGO_URL && sender?.profilePictureBannerColor
                                                ? { backgroundColor: sender.profilePictureBannerColor }
                                                : undefined
                                        }>
                                            <AvatarImage src={sender?.profilePicture || ""} />
                                            <AvatarFallback>{getInitialsFallback(sender?.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex items-start flex-col">
                                            <h3 className="font-semibold">{sender?.displayName}</h3>
                                            <p className="text-muted-foreground text-xs">{formatDate(messageSentAt?.toString(), "md")}</p>
                                        </div>
                                    </div>

                                    {/* Action buttons - right side */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 bg-muted border border-border rounded-md p-0.5">
                                            {controlButtons.map((button, idx) => (
                                                <Tooltip key={idx}>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="hover:bg-transparent" onClick={() => button.onClick(attachment)}>
                                                            <button.icon size={18} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {button.tooltip}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                            <DropdownMenu>
                                                <Tooltip>
                                                    <DropdownMenuTrigger asChild>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="hover:bg-transparent"
                                                            >
                                                                <IconDots size={18} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                    </DropdownMenuTrigger>
                                                    <TooltipContent>
                                                        More
                                                    </TooltipContent>
                                                </Tooltip>
                                                <DropdownMenuContent sideOffset={8} onCloseAutoFocus={(e) => e.preventDefault()} className="w-40">
                                                    <DropdownMenuItem onClick={() => copyImageToClipboard()} className="flex items-center justify-between">
                                                        Copy Image
                                                        <IconCopy size={18} />
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleCopy(attachment.url)} className="flex items-center justify-between">
                                                        Copy Link
                                                        <IconLink size={18} />
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger>View Details</DropdownMenuSubTrigger>
                                                        <DropdownMenuPortal>
                                                            <DropdownMenuSubContent sideOffset={10} className="p-1">
                                                                <DropdownMenuItem onClick={() => handleCopy(attachment.name)} className="flex flex-col items-start gap-0">
                                                                    <span className="text-accent font-semibold">Filename</span>
                                                                    <span className="text-xs">{attachment.name}</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleCopy(attachment.size.toString())} className="flex flex-col items-start gap-0">
                                                                    <span className="text-accent font-semibold">Size</span>
                                                                    <span className="text-xs">{attachment.size}</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuPortal>
                                                    </DropdownMenuSub>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <Button onClick={() => {
                                            setSelectedImageIndex(null)
                                            setIsZoomed(false)
                                        }} variant="outline" size="sm" className="size-10.5 bg-muted hover:bg-hover/80 border-border">
                                            <IconX size={16} />
                                            <span className="sr-only">Close</span>
                                        </Button>
                                    </div>
                                </div>
                                <div
                                    ref={containerRef}
                                    className="relative w-full h-3/4 overflow-hidden"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    <div
                                        style={{
                                            transform: isZoomed ? `scale(1.5) translateY(${position.y / 10}%)` : 'none',
                                            transition: isDragging ? 'none' : 'transform 0.2s',
                                            cursor: isZoomed ? (isDragging ? 'grab' : 'zoom-out') : 'zoom-in',
                                            width: '100%',
                                            height: '100%',
                                            position: 'relative'
                                        }}
                                    >
                                        <Image
                                            ref={imgRef}
                                            src={attachment.url}
                                            alt={attachment.name}
                                            fill
                                            onClick={() => {
                                                if (hasDragged) {
                                                    setHasDragged(false);
                                                    return;
                                                }
                                                if (!isZoomed) {
                                                    setIsZoomed(true);
                                                } else {
                                                    setIsZoomed(false);
                                                    setPosition({ x: 0, y: 0 });
                                                }
                                            }}
                                            className="object-contain"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            quality={100}
                                            draggable={false}
                                        />
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    ))}
                </div>
            )}
            <Dialog
                open={isForwardOpen}
                onOpenChange={(open) => {
                    setIsForwardOpen(open);
                    if (!open && savedImageIndex !== null) setSelectedImageIndex(savedImageIndex)
                }}
            >
                <DialogContent
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    className="max-w-lg!"
                >
                    <DialogHeader>
                        <DialogTitle>Forward To</DialogTitle>
                        <DialogDescription>Select where you want to share this message.</DialogDescription>
                    </DialogHeader>
                    <ForwardMessage imageMessage={{ originalMessageId: messageId ?? "", attachments: selectedAttachment ?? { url: "", name: "", type: "", size: 0 } }} setIsForwardDialogOpen={setIsForwardOpen} />
                </DialogContent>
            </Dialog>

            {/* Videos */}
            {videos.map((attachment, index) => (
                <div
                    key={index}
                    className="relative group cursor-pointer overflow-hidden rounded-lg bg-[#2f3136] max-w-lg"
                >
                    <div className="relative h-[300px]">
                        <Image
                            src={attachment.url || "/placeholder.svg"}
                            alt={attachment.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black bg-opacity-60 rounded-full p-4 hover:bg-opacity-80 transition-all">
                                <IconPlayerPlayFilled className="w-8 h-8 text-white fill-white" />
                            </div>
                        </div>
                    </div>
                    <div className="p-2">
                        <p className="text-[#dcddde] text-sm truncate">{attachment.name}</p>
                    </div>
                </div>
            ))}

            {/* Audio Messages */}
            {audios.length > 0 && (
                <div className="space-y-2 mb-2">
                    {audios.map((attachment, index) => (
                        <AudioPlayer key={index} attachment={attachment} isAlert={isAlert} />
                    ))}
                </div>
            )}

            {/* Files */}
            {files.length > 0 && (
                <div className="space-y-1">
                    {files.map((attachment, index) => (
                        <div
                            key={index}
                            className="flex mb-2 items-center space-x-3 p-3 bg-muted rounded border border-secondary-foreground hover:border-primary cursor-pointer transition-colors duration-200 max-w-md"
                        >
                            <div className="shrink-0">
                                <div className="w-12 h-12 bg-primary rounded flex items-center justify-center">
                                    {getFileIcon({ file: attachment })}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className=" text-sm font-semibold truncate">{attachment.name}</p>
                                <p className="text-xs text-muted-foreground font-semibold">{formatBytes(attachment.size)}</p>
                            </div>
                            <Button onClick={() => downloadFile(attachment.url, attachment.name)} variant="ghost" size="icon" className="shrink-0 bg-hover hover:bg-hover/80 size-10">
                                <IconDownload size={20} />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function getGridClass(count: number): string {
    if (count === 1) return "grid-cols-1"
    if (count === 2) return "grid-cols-1 lg:grid-cols-2"
    return "w-fit grid-col-1 lg:grid-cols-3"  // Added w-fit to prevent extra space
}
