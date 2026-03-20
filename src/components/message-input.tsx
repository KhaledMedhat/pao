"use client";

import { useEditor, EditorContent, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { SuggestionKeyDownProps } from "@tiptap/suggestion";
import { IconFileUploadFilled, IconMicrophone, IconMicrophoneFilled, IconMoodSmile, IconPaperclip, IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlus, IconSend, IconTrash, IconX } from "@tabler/icons-react";
import { cn, getInitialsFallback } from "~/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupButton } from "./ui/input-group";
import { FriendInterface } from "~/interfaces/user.interface";
import ReactionPicker from "./reaction-picker";
import { Button } from "./ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";
import { useSendMessageMutation, useUpdateMessageMutation } from "~/redux/apis/channel.api";
import { Attachment, MessageInterface, MessageType } from "~/interfaces/message.interface";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import { selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import { socketService } from "~/lib/socket";
import { selectActiveChannelRoom, selectIsReplying, selectPendingMention, selectReplyingToMessage } from "~/redux/slices/app/app-selector";
import { setIsReplying, setPendingMention, setReplyingToMessage } from "~/redux/slices/app/app-slice";
import Link from "next/link";
import { ConfigPrefix, RecordingState } from "~/interfaces/app.interface";
import useUpload from "~/hooks/use-upload";
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Channel, ChannelType } from "~/interfaces/channels.interface";
import { SHORT_LOGO_URL } from "~/constants/constants";

interface MentionListProps {
  items: FriendInterface[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item._id, label: item.displayName });
      }
    },
    [items, command]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="p-2">
        <p className="text-sm text-muted-foreground">No users found</p>
      </div>
    );
  }

  return (
    <div className="flex items-start flex-col p-2 gap-2">
      <p className="text-xs text-muted-foreground font-semibold uppercase">members</p>
      {items.map((item, index) => (
        <Button
          key={item._id}
          variant="ghost"
          onClick={() => selectItem(index)}
          className={cn(
            "flex items-center gap-2 w-full text-accent-foreground px-2 h-11 rounded-md text-sm text-left transition-colors justify-between hover:bg-main-primary-foreground",
            index === selectedIndex && "bg-main-primary-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Avatar style={
              item.profilePicture === SHORT_LOGO_URL && item.profilePictureBannerColor
                ? { backgroundColor: item.profilePictureBannerColor }
                : undefined
            }>
              <AvatarImage src={item.profilePicture} alt={item.displayName} />
              <AvatarFallback>{getInitialsFallback(item.displayName)}</AvatarFallback>
              <AvatarBadge className="size-2.5!" variant={item.status.type} />
            </Avatar>
            <span className="flex items-center gap-2">{item.displayName}</span>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">{item.username}</span>
        </Button>
      ))}
    </div>
  );
});

MentionList.displayName = "MentionList";

interface MessageInputProps {
  placeholder?: string;
  mentionSuggestions?: FriendInterface[];
  disabled?: boolean;
  className?: string;
  value?: string;
  channel: Channel;
  isEditing: boolean;
  messageId?: string;
  setIsEditing?: (isEditing: boolean) => void;
  onAddPendingMessage?: (message: JSONContent, attachments: Attachment[], type: MessageType, replyMessageId?: MessageInterface) => string;
  onRemovePendingMessage?: (pendingId: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ placeholder, mentionSuggestions = [], disabled = false, className, channel, value, isEditing, messageId, setIsEditing, onAddPendingMessage, onRemovePendingMessage }) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionItems, setMentionItems] = useState<FriendInterface[]>([]);
  const [mentionCommand, setMentionCommand] = useState<((item: { id: string; label: string }) => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<MentionListRef>(null);
  const [sendMessage] = useSendMessageMutation();
  const [updateMessage] = useUpdateMessageMutation();
  const currentUserInfo = useAppSelector(selectCurrentUserInfo);
  const [currentEmoji, setCurrentEmoji] = useState<string>("😊");
  const isReplying = useAppSelector(selectIsReplying);
  const replyingToMessage = useAppSelector(selectReplyingToMessage);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [duration, setDuration] = useState(0)
  const [waveformWidth, setWaveformWidth] = useState(0)

  // Attachments state
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startUpload } = useUpload(ConfigPrefix.CHAT_INPUT_UPLOADER)
  const currentActiveChannelRoom = useAppSelector(selectActiveChannelRoom);
  const pendingMention = useAppSelector(selectPendingMention);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement | null>(null)
  const waveformBarsRef = useRef<number[]>([])
  const lastBarTimeRef = useRef(0)
  const [waveformBars, setWaveformBars] = useState<number[]>([])
  const isRecording = recordingState !== "idle"

  const BAR_WIDTH = 3
  const BAR_GAP = 2

  // Use ref for maxBars so the animation loop always has the current value
  const maxBarsRef = useRef(60)

  useEffect(() => {
    if (waveformWidth > 0) {
      maxBarsRef.current = Math.floor(waveformWidth / (BAR_WIDTH + BAR_GAP))
    }
  }, [waveformWidth])

  useEffect(() => {
    const container = waveformContainerRef.current
    if (!container) return

    // Get initial width after a frame to ensure DOM is fully rendered
    const frameId = requestAnimationFrame(() => {
      const initialWidth = container.getBoundingClientRect().width
      if (initialWidth > 0) {
        setWaveformWidth(initialWidth)
      }
    })

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWaveformWidth(entry.contentRect.width)
      }
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [recordingState])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Create preview URLs for attachments
  const previewUrls = useMemo(() => {
    return attachments.map(file => URL.createObjectURL(file))
  }, [attachments])

  // Cleanup preview URLs when they change
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the container (not entering a child)
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith("image/"))

    if (imageFiles.length > 0) {
      setAttachments(prev => [...prev, ...imageFiles])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith("image/"))

    if (imageFiles.length > 0) {
      setAttachments(prev => [...prev, ...imageFiles])
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const startVisualizer = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const BAR_INTERVAL = 80 // ms between new bars
    lastBarTimeRef.current = performance.now()

    const update = (now: number) => {
      analyser.getByteFrequencyData(dataArray)

      // Compute average volume level (0-1)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const avg = sum / dataArray.length / 255

      // Add a new bar at fixed intervals — newest appears on the right
      if (now - lastBarTimeRef.current >= BAR_INTERVAL) {
        lastBarTimeRef.current = now
        const current = waveformBarsRef.current
        const newBars = [...current, avg]
        // When full, trim oldest bars from the left so it scrolls left
        while (newBars.length > maxBarsRef.current) {
          newBars.shift()
        }
        waveformBarsRef.current = newBars
        setWaveformBars([...newBars])
      }

      animationRef.current = requestAnimationFrame(update)
    }
    animationRef.current = requestAnimationFrame(update)
  }, [])

  const stopVisualizer = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start(100)
      setRecordingState("recording")
      startTimer()
      startVisualizer()
    } catch {
      console.error("Microphone permission denied")
    }
  }, [startTimer, startVisualizer])

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause()
      setRecordingState("paused")
      stopTimer()
      stopVisualizer()
    }
  }, [stopTimer, stopVisualizer])

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume()
      setRecordingState("recording")
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
      startVisualizer()
    }
  }, [startVisualizer])

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    audioContextRef.current?.close()
    audioChunksRef.current = []
    stopTimer()
    stopVisualizer()
    setRecordingState("idle")
    setDuration(0)
    waveformBarsRef.current = []
    setWaveformBars([])
  }, [stopTimer, stopVisualizer])


  const sendRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder) {
      const currentDuration = duration

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })

        // Convert blob to File for upload
        const audioFile = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" })

        // Upload the audio file to get a permanent URL
        const uploadResult = await startUpload([audioFile])

        if (uploadResult && uploadResult.length > 0) {
          const uploadedFile = uploadResult[0]
          const attachment: Attachment = {
            type: "audio",
            url: uploadedFile.ufsUrl,
            name: uploadedFile.name,
            size: uploadedFile.size,
            duration: currentDuration,
            key: uploadedFile.key,
          }

          await sendMessage({
            referenceId: channel?._id,
            message: {
              type: "doc", content: [
                { type: "paragraph", content: [{ type: "text", text: "" }] },
              ]
            },
            sentBy: currentUserInfo._id,
            type: MessageType.TEXT,
            attachment: [attachment],
          })
        }

        audioChunksRef.current = []
      }

      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()
      }
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    audioContextRef.current?.close()
    stopTimer()
    stopVisualizer()
    setRecordingState("idle")
    setDuration(0)
    waveformBarsRef.current = []
    setWaveformBars([])
  }, [duration, startUpload, channel?._id, currentUserInfo._id, sendMessage, stopTimer, stopVisualizer])


  const editor = useEditor({
    onUpdate: async ({ editor }) => {
      const socket = socketService.getSocket();
      if (editor?.getText().length > 0) {
        socket?.emit("typing", {
          user: currentUserInfo,
          isTyping: true,
          channelId: channel?._id
        })
        setTimeout(() => {
          socket?.emit("typing", {
            user: currentUserInfo,
            isTyping: false,
            channelId: channel?._id
          })
        }, 2000)
      } else {
        socket?.emit("typing", {
          user: currentUserInfo,
          isTyping: false,
          channelId: channel?._id
        });
      }
    },
    immediatelyRender: false,
    content: value ?? "",
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention bg-mention text-mention-secondary font-semibold px-0.5 rounded",
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            return mentionSuggestions
              .filter(
                (item) => item.displayName.toLowerCase().includes(query.toLowerCase()) || item.username.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 5);
          },
          render: () => {
            return {
              onStart: (props) => {
                setMentionItems(props.items as FriendInterface[]);
                setMentionCommand(() => props.command);
                setMentionOpen(true);
              },
              onUpdate: (props) => {
                setMentionItems(props.items as FriendInterface[]);
                setMentionCommand(() => props.command);
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") {
                  setMentionOpen(false);
                  return true;
                }
                return mentionListRef.current?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                setMentionOpen(false);
                setMentionItems([]);
                setMentionCommand(null);
              },
            };
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 leading-relaxed",
          "[&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:max-w-full [&_.is-editor-empty:first-child::before]:whitespace-normal [&_.is-editor-empty:first-child::before]:[overflow-wrap:anywhere] is-editor-empty:first-child::before]:truncate"
        ),
      },
      handleKeyDown: (view, event) => {
        if (event.key === "Enter" && !event.shiftKey && !mentionOpen) {
          event.preventDefault();
          handleSend();
          return true;
        }
        return false;
      },
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  // Add emoji to the editor at current cursor position
  const addEmojiToMessage = useCallback((emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
  }, [editor]);

  useEffect(() => {
    if (!editor || !pendingMention) return;
    if (pendingMention.channelId !== channel?._id) return;

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "mention",
          attrs: { id: pendingMention.id, label: pendingMention.label },
        },
        { type: "text", text: " " },
      ])
      .run();

    dispatch(setPendingMention(null));
  }, [editor, pendingMention, channel?._id, dispatch]);

  const handleSend = useCallback(async () => {
    const hasContent = editor && !editor.isEmpty;
    const hasAttachments = attachments.length > 0;

    if (!hasContent && !hasAttachments) return;

    const json = hasContent ? editor.getJSON() : { type: "doc", content: [] };

    // Clear input and attachments immediately (before upload)
    if (hasContent) {
      editor.commands.clearContent();
    }
    const filesToUpload = [...attachments];
    setAttachments([]);

    // Determine message type
    const msgType = (isReplying && replyingToMessage) ? MessageType.REPLY : MessageType.TEXT;

    // Create pending message with uploading attachments (for optimistic UI)
    let pendingId: string | undefined;
    if (hasAttachments && onAddPendingMessage) {
      const pendingAttachments: Attachment[] = filesToUpload.map(file => ({
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        isUploading: true,
      }));
      pendingId = onAddPendingMessage(json, pendingAttachments, msgType, replyingToMessage ?? undefined);
    }

    // Upload attachments in background
    let uploadedFiles: { url: string; name: string; size: number; type: string }[] = [];
    if (hasAttachments) {
      const uploadResult = await startUpload(filesToUpload);
      if (uploadResult) {
        uploadedFiles = uploadResult.map(file => ({
          url: file.ufsUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          key: file.key,
        }));
      }
    }

    // Remove pending message after upload (real message will arrive via websocket)
    if (pendingId && onRemovePendingMessage) {
      onRemovePendingMessage(pendingId);
    }

    if (isEditing && messageId) {
      setIsEditing?.(false);
      await updateMessage({
        messageId,
        body: { referenceId: channel?._id, updateMessageDto: { message: json } },
      });
    } else if (isReplying && replyingToMessage) {
      dispatch(setIsReplying(false));
      dispatch(setReplyingToMessage(null));
      await sendMessage({
        referenceId: channel?._id,
        referenceMessageRoomId: channel?.type === ChannelType.Server ? currentActiveChannelRoom?._id : undefined,
        message: json,
        sentBy: currentUserInfo._id,
        type: MessageType.REPLY,
        replyMessageId: replyingToMessage._id,
        attachment: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      });
    } else {
      await sendMessage({
        referenceId: channel?._id,
        referenceMessageRoomId: channel?.type === ChannelType.Server ? currentActiveChannelRoom?._id : undefined,
        message: json,
        sentBy: currentUserInfo._id,
        type: MessageType.TEXT,
        attachment: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      });
    }
  }, [editor, attachments, startUpload, isEditing, messageId, setIsEditing, updateMessage, channel?._id, isReplying, replyingToMessage, dispatch, sendMessage, currentUserInfo._id, onAddPendingMessage, onRemovePendingMessage]);

  return (
    <Popover open={mentionOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "w-full flex flex-col relative transition-colors",
            isDragging && "ring-2 ring-primary ring-dashed rounded-lg bg-primary/5"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 rounded-lg pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-primary">
                <IconFileUploadFilled size={32} />
                <span className="text-sm font-medium">Drop images here</span>
              </div>
            </div>
          )}

          {isReplying && replyingToMessage && (
            <Link href={`#${replyingToMessage._id}`} className="bg-main-primary rounded-md rounded-b-none p-3 flex items-center justify-between">
              <p className="text-sm">Replying to <span className="font-semibold">{replyingToMessage.sentBy?.displayName}</span></p>
              <Button variant="ghost" size="icon-sm" type="button" className="rounded-full size-6" onClick={() => {
                dispatch(setIsReplying(false))
                dispatch(setReplyingToMessage(null))
              }}>
                <IconX size={16} />
              </Button>
            </Link>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className={cn(
              "bg-main-primary p-3 flex gap-2 flex-wrap",
              isReplying && replyingToMessage ? "" : "rounded-t-md"
            )}>
              {attachments.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative group">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={previewUrls[index]}
                      alt={file.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        type="button"
                        className="absolute -top-1.5 -right-1.5 size-5 rounded-full"
                        onClick={() => removeAttachment(index)}
                      >
                        <IconX size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Remove attachment
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}

          <InputGroup
            ref={containerRef}
            className={cn(
              "h-auto min-h-[62px] transition-all bg-main-primary px-2",
              isFocused && !((isReplying && replyingToMessage) || attachments.length > 0) && "border ring-ring/50 ring-[1px]",
              (isReplying && replyingToMessage) || attachments.length > 0 ? "rounded-t-none" : "",
              disabled && "opacity-50 pointer-events-none",
              className
            )}
          >
            {isRecording ?
              <div className="flex items-center flex-1 min-w-0 gap-2 animate-in fade-in duration-200">
                {/* Delete / Cancel Button */}
                <InputGroupAddon align="inline-start" className="gap-1 self-center">
                  <InputGroupButton variant="destructive" size="sm" type="button" onClick={cancelRecording}>
                    <IconTrash size={22} />
                  </InputGroupButton>
                </InputGroupAddon>

                <div className="flex items-center gap-2 min-w-[52px]">
                  {recordingState === "recording" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                    </span>
                  )}
                  {recordingState === "paused" && (
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground" />
                    </span>
                  )}
                  <span className="text-xs font-mono text-foreground tabular-nums">
                    {formatDuration(duration)}
                  </span>
                </div>

                {/* Waveform Visualizer */}
                <div
                  ref={waveformContainerRef}
                  className="flex-1 min-w-0 h-10 overflow-hidden relative"
                  aria-label="Audio waveform visualization"
                  role="img"
                >
                  <div
                    className="flex items-center justify-start h-full absolute inset-0"
                    style={{ gap: `${BAR_GAP}px` }}
                  >
                    {waveformBars.map((level, i) => {
                      const heightPercent =
                        recordingState === "paused"
                          ? Math.max(8, level * 35)
                          : Math.max(8, level * 200)
                      return (
                        <div
                          key={i}
                          className={cn(
                            "rounded-full shrink-0",
                            recordingState === "recording"
                              ? "bg-accent/40"
                              : "bg-muted-foreground/40"
                          )}
                          style={{
                            width: `${BAR_WIDTH}px`,
                            height: `${heightPercent}%`,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>

                <InputGroupAddon align="inline-end" className="gap-0 self-center">
                  {/* Pause / Resume Button */}
                  <InputGroupButton variant="ghost" size="icon-xs" className="rounded-full" type="button" onClick={
                    recordingState === "recording"
                      ? pauseRecording
                      : resumeRecording
                  }>
                    {recordingState === "recording" ? (
                      <IconPlayerPauseFilled size={22} />
                    ) : (
                      <IconPlayerPlayFilled size={22} />
                    )}
                  </InputGroupButton>

                  {/* Send Recording Button */}
                  <InputGroupButton variant="ghost" size="sm" type="button" onClick={sendRecording}>
                    <IconSend size={22} />
                    <span className="sr-only">Send recording</span>
                  </InputGroupButton>
                </InputGroupAddon>

              </div>
              :
              <>
                <div className="flex-1 min-w-0 w-0 max-h-[180px] overflow-y-auto overflow-x-hidden py-2">
                  <EditorContent editor={editor} />
                </div>
                {!value && <InputGroupAddon align="inline-start" className="gap-1 self-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton variant="ghost" size="icon-sm" type="button">
                        <IconPlus size={22} />
                      </InputGroupButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <IconFileUploadFilled />
                        Upload a File
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </InputGroupAddon>}
                <InputGroupAddon align="inline-end" className="gap-0 self-center">
                  {!value && (
                    <InputGroupButton
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconPaperclip className="size-4" />
                      <span className="sr-only">Attach file</span>
                    </InputGroupButton>
                  )}
                  {!value && <InputGroupButton variant="ghost" size="icon-sm" type="button" onClick={startRecording}>
                    <IconMicrophoneFilled size={22} />
                    <span className="sr-only">Record audio</span>
                  </InputGroupButton>}
                  <ReactionPicker isShortcut={false} currentEmoji={currentEmoji} setCurrentEmoji={setCurrentEmoji} isMessageInput={true} addEmojiToMessage={addEmojiToMessage} />

                </InputGroupAddon>
              </>
            }

          </InputGroup>
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="p-1"
        style={{ width: containerRef.current?.offsetWidth ?? "auto" }}
      >
        {mentionCommand && (
          <MentionList
            ref={mentionListRef}
            items={mentionItems}
            command={mentionCommand}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};

export default MessageInput;
