"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Maximize2,
  Minimize2,
  X,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { getInitialsFallback } from "~/lib/utils";
import { CallStatus, CallType, ConsumerData, ScreenShareInfo } from "~/interfaces/call.interface";
import { CallMembers } from "~/interfaces/call.interface";
import { SHORT_LOGO_URL } from "~/constants/constants";
import { cn } from "~/lib/utils";
import { useAppSelector } from "~/redux/hooks";
import { selectCurrentUserInfo } from "~/redux/slices/user/user-selector";
import AnimatedRingingAvatar from "./animated-ringing-avatar";
import { Card, CardContent } from "./ui/card";
import { ButtonGroup } from "./ui/button-group";
import { IconMicrophoneFilled, IconChevronDown, IconVideoFilled, IconSettings, IconEye, IconPhoneFilled, IconScreenShare, IconScreenShareOff, IconDots, IconHeadphonesOff, IconMicrophoneOff, IconLayoutGrid } from "@tabler/icons-react";
import { HoveredState } from "~/interfaces/app.interface";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { Slider } from "./ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface ActiveCallScreenProps {
  callType: CallType;
  members: CallMembers[];
  localStream: MediaStream | null;
  callConsumers: Record<string, ConsumerData>;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  screenShareInfo: ScreenShareInfo | null;
  isWatchingScreen: boolean;
  screenStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onWatchScreen: () => void;
  onStopWatchingScreen: () => void;
  onHangUp: () => void;
}

function ParticipantTile({
  name,
  profilePicture,
  bannerColor,
  status,
  stream,
  isMuted,
  isDeafened,
  isSpeaking,
  isCurrentUser,
  isVideoOn,
}: {
  name: string;
  profilePicture?: string;
  bannerColor?: string;
  status: CallStatus;
  stream?: MediaStream | null;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  isCurrentUser?: boolean;
  isVideoOn?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && isVideoOn) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOn]);

  const isConnected = status === CallStatus.Accepted;

  const showSpeakingRing = isSpeaking && isConnected && !isMuted && !isDeafened;

  if (isVideoOn && stream) {
    return (
      <div
        className={cn(
          "relative aspect-video w-72 rounded-xl overflow-hidden bg-black transition-shadow duration-200",
          showSpeakingRing && "ring-[3px] ring-success shadow-[0_0_12px_rgba(34,197,94,0.4)]"
        )}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isCurrentUser}
          className="size-full object-cover"
        />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 rounded-md px-2 py-1">
          <Avatar
            className="size-5"
            style={
              profilePicture === SHORT_LOGO_URL && bannerColor
                ? { backgroundColor: bannerColor }
                : undefined
            }
          >
            <AvatarImage src={profilePicture} />
            <AvatarFallback className="text-[8px]">
              {getInitialsFallback(name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-white font-medium truncate max-w-24">{name}</span>
        </div>
        {(isMuted || isDeafened) && (
          <div className="absolute bottom-2 right-2 bg-destructive rounded-full p-1">
            {isDeafened ? (
              <HeadphoneOff className="size-3 text-white" />
            ) : (
              <MicOff className="size-3 text-white" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          className={cn(
            "rounded-full transition-shadow duration-200",
            showSpeakingRing && "ring-[3px] ring-success shadow-[0_0_12px_rgba(34,197,94,0.4)]"
          )}
        >
          {status === CallStatus.Calling ?
            <AnimatedRingingAvatar isConnected={isConnected} profilePicture={profilePicture} profilePictureBannerColor={bannerColor} displayName={name} />
            :
            <Avatar
              className={cn(
                "size-22",
                !isConnected && "brightness-50"
              )}
              style={
                profilePicture === SHORT_LOGO_URL && bannerColor
                  ? { backgroundColor: bannerColor }
                  : undefined
              }
            >
              <AvatarImage src={profilePicture} />
              <AvatarFallback className="text-2xl">
                {getInitialsFallback(name)}
              </AvatarFallback>
            </Avatar>
          }
        </div>

        {(isMuted || isDeafened) && (
          <div className="absolute bottom-0 right-0 bg-destructive rounded-full ring-3 ring-main-primary p-2">
            {isDeafened ? (
              <IconHeadphonesOff size={16} stroke={2} />

            ) : (
              <IconMicrophoneOff size={16} stroke={2} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RemoteAudio({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay />;
}

function GridParticipantTile({
  name,
  profilePicture,
  bannerColor,
  status,
  stream,
  isMuted,
  isDeafened,
  isSpeaking,
  isCurrentUser,
  isVideoOn,
}: {
  name: string;
  profilePicture?: string;
  bannerColor?: string;
  status: CallStatus;
  stream?: MediaStream | null;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  isCurrentUser?: boolean;
  isVideoOn?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && isVideoOn) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOn]);

  const isConnected = status === CallStatus.Accepted;
  const showSpeakingRing = isSpeaking && isConnected && !isMuted && !isDeafened;
  const showVideo = isVideoOn && stream;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-xl overflow-hidden bg-card/50 border border-border/30 size-full min-h-32 transition-shadow duration-200",
        showVideo && "bg-black",
        showSpeakingRing && "ring-[3px] ring-success shadow-[0_0_12px_rgba(34,197,94,0.4)]"
      )}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isCurrentUser}
          className="size-full object-cover"
        />
      ) : (
        <Avatar
          className={cn(
            "size-32 aspect-square",
            !isConnected && "brightness-50"
          )}
          style={
            profilePicture === SHORT_LOGO_URL && bannerColor
              ? { backgroundColor: bannerColor }
              : undefined
          }
        >
          <AvatarImage src={profilePicture} />
          <AvatarFallback className="text-lg">
            {getInitialsFallback(name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md px-2 py-1",
        showVideo && "bg-black/50"
      )}>
        <span className={cn(
          "text-xs font-medium truncate max-w-32",
          showVideo ? "text-white" : "text-foreground/80"
        )}>
          {name}
        </span>
      </div>

      {(isMuted || isDeafened) && (
        <div className="absolute bottom-2 right-2 bg-destructive rounded-full p-1.5">
          {isDeafened ? (
            <IconHeadphonesOff size={14} stroke={2} className="text-white" />
          ) : (
            <IconMicrophoneOff size={14} stroke={2} className="text-white" />
          )}
        </div>
      )}
    </div>
  );
}

function ScreenShareGridTile({
  name,
  profilePicture,
  bannerColor,
  isMuted,
  isDeafened,
  isSpeaking,
  isSharing,
  onWatchScreen,
}: {
  name: string;
  profilePicture?: string;
  bannerColor?: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  isSharing?: boolean;
  onWatchScreen?: () => void;
}) {
  const showSpeakingRing = isSpeaking && !isMuted && !isDeafened;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-70 h-40 rounded-xl bg-card/50 border border-border/30 transition-all duration-200",
        showSpeakingRing && "ring-2 ring-success shadow-[0_0_10px_rgba(34,197,94,0.3)]"
      )}
    >
      <Avatar
        className="size-12"
        style={
          profilePicture === SHORT_LOGO_URL && bannerColor
            ? { backgroundColor: bannerColor }
            : undefined
        }
      >
        <AvatarImage src={profilePicture} />
        <AvatarFallback className="text-sm">
          {getInitialsFallback(name)}
        </AvatarFallback>
      </Avatar>

      {/* Name badge bottom-left */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5">
        <span className="text-xs font-medium text-foreground/80 truncate block text-center py-0.5">
          {name}
        </span>
      </div>

      {/* Mute/deafen indicator */}
      {(isMuted || isDeafened) && (
        <div className="absolute top-1.5 right-1.5 bg-destructive rounded-full p-1">
          {isDeafened ? (
            <HeadphoneOff className="size-2.5 text-white" />
          ) : (
            <MicOff className="size-2.5 text-white" />
          )}
        </div>
      )}

      {/* Screen share badge + watch button */}
      {isSharing && (
        <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <IconScreenShare size={20} stroke={1.5} className="text-white/80 mb-1" />
          {onWatchScreen && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={onWatchScreen}
            >
              <IconEye size={12} />
              Watch
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ScreenWatchViewer({
  screenStream,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onStopWatching,
  participants,
  currentUser,
  callConsumers,
}: {
  screenStream: MediaStream;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onStopWatching: () => void;
  participants: CallMembers[];
  currentUser: { displayName: string; profilePicture?: string; profilePictureBannerColor?: string; _id: string };
  callConsumers: Record<string, ConsumerData>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.min(Math.max(z + delta, 0.5), 4);
    });
  }, []);

  return (
    <div ref={containerRef} className="flex flex-1 h-full min-h-0">
      {/* Main screen view */}
      <div className="flex-1 relative rounded-xl overflow-hidden bg-black group min-w-0">
        <div
          className="size-full overflow-hidden"
          onWheel={handleWheel}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-contain transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/40 to-transparent pt-10 pb-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-white/70 min-w-12 text-center">{Math.round(zoom * 100)}%</span>

            <div className="w-px h-5 bg-white/20 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 text-white hover:bg-white/20" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-white/20 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-9 text-white hover:bg-white/20", isMuted && "text-destructive")}
                  onClick={onToggleMute}
                >
                  {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("size-9 text-white hover:bg-white/20", isDeafened && "text-destructive")}
                  onClick={onToggleDeafen}
                >
                  {isDeafened ? <HeadphoneOff className="size-4" /> : <Headphones className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDeafened ? "Undeafen" : "Deafen"}</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-white/20 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-white hover:bg-white/20"
                  onClick={() => setSidebarOpen((v) => !v)}
                >
                  {sidebarOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sidebarOpen ? "Hide Participants" : "Show Participants"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-white bg-destructive/80 hover:bg-destructive"
                  onClick={onStopWatching}
                >
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop Watching</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Right sidebar with participants */}
      <div
        className={cn(
          "flex flex-col gap-2 bg-card/30 border-l border-border/30 overflow-y-auto transition-all duration-300",
          sidebarOpen ? "w-40 p-2 opacity-100" : "w-0 p-0 opacity-0 overflow-hidden"
        )}
      >
        {sidebarOpen && (
          <>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
              In Call
            </span>
            {/* Current user */}
            <SidebarParticipant
              name={currentUser.displayName}
              profilePicture={currentUser.profilePicture}
              bannerColor={currentUser.profilePictureBannerColor}
              isMuted={isMuted}
              isDeafened={isDeafened}
              isSpeaking={false}
            />
            {/* Other participants */}
            {participants
              .filter((m) => m.info._id !== currentUser._id)
              .map((member) => {
                const consumer = Object.values(callConsumers).find(
                  (c) => c.associatedUser._id === member.info._id
                );
                return (
                  <SidebarParticipant
                    key={member.info._id}
                    name={member.info.displayName}
                    profilePicture={member.info.profilePicture}
                    bannerColor={member.info.profilePictureBannerColor}
                    isMuted={consumer?.isMuted}
                    isDeafened={consumer?.isDeafened}
                    isSpeaking={consumer?.isSpeaking}
                  />
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}

function SidebarParticipant({
  name,
  profilePicture,
  bannerColor,
  isMuted,
  isDeafened,
  isSpeaking,
}: {
  name: string;
  profilePicture?: string;
  bannerColor?: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
}) {
  const showSpeakingRing = isSpeaking && !isMuted && !isDeafened;

  return (
    <div className="flex items-center gap-2 px-1.5 py-1 rounded-md">
      <div className={cn(
        "rounded-full transition-shadow duration-200 shrink-0",
        showSpeakingRing && "ring-2 ring-success"
      )}>
        <Avatar
          className="size-7"
          style={
            profilePicture === SHORT_LOGO_URL && bannerColor
              ? { backgroundColor: bannerColor }
              : undefined
          }
        >
          <AvatarImage src={profilePicture} />
          <AvatarFallback className="text-[9px]">
            {getInitialsFallback(name)}
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="text-[11px] text-foreground/80 truncate flex-1">{name}</span>
      {(isMuted || isDeafened) && (
        <div className="shrink-0">
          {isDeafened ? (
            <HeadphoneOff className="size-3 text-destructive" />
          ) : (
            <MicOff className="size-3 text-destructive" />
          )}
        </div>
      )}
    </div>
  );
}

export default function ActiveCallScreen({
  callType,
  members,
  localStream,
  callConsumers,
  isMuted,
  isDeafened,
  isVideoEnabled,
  isSpeaking,
  isScreenSharing,
  screenShareInfo,
  isWatchingScreen,
  screenStream,
  onToggleMute,
  onToggleDeafen,
  onToggleVideo,
  onToggleScreenShare,
  onWatchScreen,
  onStopWatchingScreen,
  onHangUp,
}: ActiveCallScreenProps) {
  const currentUser = useAppSelector(selectCurrentUserInfo);
  const [isGroupHovered, setIsGroupHovered] = useState<HoveredState | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState("default");
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState("default");
  const [selectedCameraDeviceId, setSelectedCameraDeviceId] = useState("default");
  const [inputVolume, setInputVolume] = useState([100]);
  const [outputVolume, setOutputVolume] = useState([100]);
  const [micLevel, setMicLevel] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCameraId, setPreviewCameraId] = useState("default");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputDevices(devices.filter((d) => d.kind === "audioinput"));
      setAudioOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      setVideoInputDevices(devices.filter((d) => d.kind === "videoinput"));
    } catch {
      // Device enumeration unavailable
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
  }, [enumerateDevices]);

  useEffect(() => {
    if (!localStream || localStream.getAudioTracks().length === 0) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(localStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;

    function updateLevel() {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
      setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
      animationId = requestAnimationFrame(updateLevel);
    }

    updateLevel();
    return () => {
      cancelAnimationFrame(animationId);
      source.disconnect();
      audioContext.close();
    };
  }, [localStream]);

  useEffect(() => {
    if (!previewOpen) {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
        setPreviewStream(null);
      }
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;

    async function startPreview() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: previewCameraId === "default" ? true : { deviceId: { exact: previewCameraId } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setPreviewStream(stream);
        setPreviewError(null);
      } catch {
        if (!cancelled) {
          setPreviewStream(null);
          setPreviewError("No camera available or permission denied.");
        }
      }
    }

    startPreview();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [previewOpen, previewCameraId]);

  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const isScreenShareActive = isScreenSharing || !!screenShareInfo;

  const renderControlsBar = () => (
    <div className="flex items-center justify-center gap-4 py-2">
      <Card className="p-0 h-12 flex-row items-center justify-center">
        <CardContent className="p-0 flex items-center">
          <ButtonGroup className="w-full flex items-center justify-center p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onToggleMute}
                  size="icon"
                  className={`${isGroupHovered === HoveredState.MIC_MORE && "bg-foreground/10"} ${isMuted && "bg-destructive/20 hover:bg-destructive/30"}`} onMouseEnter={() => setIsGroupHovered(HoveredState.MIC)} onMouseLeave={() => setIsGroupHovered(null)}
                >
                  <div className="relative">
                    <IconMicrophoneFilled size={20} className={`${isMuted ? "text-destructive" : "text-foreground"}`} />
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rotate-135">
                      <span className={cn("block h-0.5 w-6 bg-destructive/80 ring-card ring-1 origin-right transition-transform duration-200", isMuted ? "scale-x-100" : "scale-x-0")} />
                    </div>
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className={`${isGroupHovered === HoveredState.MIC && "bg-foreground/10"} ${isMuted && "bg-destructive/25 hover:bg-destructive/20"}`} onMouseEnter={() => setIsGroupHovered(HoveredState.MIC_MORE)} onMouseLeave={() => setIsGroupHovered(null)}
                    >
                      <IconChevronDown size={16} className="text-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent className="w-72 space-y-2 py-2" side="top" align="start">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <div className="flex flex-col items-start justify-start gap-1">
                        Input Device
                        <span className="text-xs text-muted-foreground">{audioInputDevices.length > 0 ? audioInputDevices[0].label : "Default"}</span>
                      </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={selectedInputDeviceId} onValueChange={setSelectedInputDeviceId}>
                        {audioInputDevices.map((device) => (
                          <DropdownMenuRadioItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                            {device.deviceId === "default" && (
                              <span className="text-xs text-muted-foreground ml-1">(Default)</span>
                            )}
                          </DropdownMenuRadioItem>
                        ))}
                        {audioInputDevices.length === 0 && (
                          <DropdownMenuItem disabled>No devices found</DropdownMenuItem>
                        )}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <div className="flex flex-col items-start justify-start gap-1">
                        Output Device
                        <span className="text-xs text-muted-foreground">{audioOutputDevices.length > 0 ? audioOutputDevices[0].label : "Default"}</span>
                      </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={selectedOutputDeviceId} onValueChange={setSelectedOutputDeviceId}>
                        {audioOutputDevices.map((device) => (
                          <DropdownMenuRadioItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                            {device.deviceId === "default" && (
                              <span className="text-xs text-muted-foreground ml-1">(Default)</span>
                            )}
                          </DropdownMenuRadioItem>
                        ))}
                        {audioOutputDevices.length === 0 && (
                          <DropdownMenuItem disabled>No devices found</DropdownMenuItem>
                        )}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Input Volume</DropdownMenuLabel>
                  <div className="px-3 pb-3" onPointerDown={(e) => e.stopPropagation()}>
                    <Slider value={inputVolume} onValueChange={setInputVolume} max={100} step={1} />
                  </div>
                  <div className="px-3 pb-2 flex gap-0.5">
                    {Array.from({ length: 20 }, (_, i) => {
                      const threshold = (i + 1) * 5;
                      const active = !isMuted && micLevel >= threshold;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "h-6 flex-1 rounded-xs transition-colors duration-75",
                            active ? "bg-success" : "bg-muted"
                          )}
                        />
                      );
                    })}
                  </div>
                  <DropdownMenuLabel>Output Volume</DropdownMenuLabel>
                  <div className="px-3 pb-2" onPointerDown={(e) => e.stopPropagation()}>
                    <Slider value={outputVolume} onValueChange={setOutputVolume} max={100} step={1} />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked={isDeafened} onSelect={(e) => e.preventDefault()} onCheckedChange={() => onToggleDeafen()}>
                    {isDeafened ? "Undeafen" : "Deafen"}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="justify-between">
                    Voice Settings
                    <IconSettings size={20} />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipTrigger asChild>
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
          </ButtonGroup>
          <ButtonGroup className="w-full flex items-center justify-center p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onToggleVideo} className={`${isGroupHovered === HoveredState.VIDEO_MORE && "bg-foreground/10"} ${isVideoEnabled && "bg-success/20 hover:bg-success/30"}`} size="icon" variant="ghost" onMouseEnter={() => setIsGroupHovered(HoveredState.VIDEO)} onMouseLeave={() => setIsGroupHovered(null)}>
                  <div className="relative">
                    <IconVideoFilled size={22} className={`${isVideoEnabled ? "text-success" : "text-foreground"}`} />
                    {!isVideoEnabled && <span className="h-0.5 w-6 absolute bottom-2.5 left-1/2 -translate-x-1/2 rotate-135 bg-foreground ring-card ring-1"></span>}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isVideoEnabled ? "Turn off Camera" : "Turn on Camera"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button className={`${isGroupHovered === HoveredState.VIDEO && "bg-foreground/10"}`} size="icon-xs" variant="ghost" onMouseEnter={() => setIsGroupHovered(HoveredState.VIDEO_MORE)} onMouseLeave={() => setIsGroupHovered(null)}>
                      <IconChevronDown size={16} className="text-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent className="w-56 space-y-2 py-2" side="top" align="start">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <div className="flex flex-col items-start justify-start gap-1">
                        Camera
                        <span className="text-xs text-muted-foreground">{videoInputDevices.length > 0 ? videoInputDevices[0].label : "Default"}</span>
                      </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup value={selectedCameraDeviceId} onValueChange={setSelectedCameraDeviceId}>
                        {videoInputDevices.map((device) => (
                          <DropdownMenuRadioItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                            {device.deviceId === "default" && (
                              <span className="text-xs text-muted-foreground ml-1">(Default)</span>
                            )}
                          </DropdownMenuRadioItem>
                        ))}
                        {videoInputDevices.length === 0 && (
                          <DropdownMenuItem disabled>No cameras found</DropdownMenuItem>
                        )}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="justify-between" onSelect={() => { setPreviewCameraId(selectedCameraDeviceId); setPreviewOpen(true); }}>
                    Preview Camera
                    <IconEye size={20} />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="justify-between">
                    Video Settings
                    <IconSettings size={22} />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </CardContent>
      </Card>
      <Card className="p-0 h-12 flex-row items-center justify-center">
        <CardContent className="p-0 flex items-center px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleScreenShare}
                className={cn(isScreenSharing && "bg-success/20 hover:bg-success/30")}
              >
                {isScreenSharing
                  ? <IconScreenShareOff stroke={2} className="text-success" />
                  : <IconScreenShare stroke={2} className="text-foreground" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isScreenSharing ? "Stop Sharing" : "Share your screen"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <IconDots stroke={2} className="text-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <DropdownMenuContent className="w-56" side="bottom" align="end">
                <DropdownMenuCheckboxItem
                  checked={isGridView}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={setIsGridView}
                >
                  Grid View
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-between">
                  Voice & Video Settings
                  <IconSettings size={18} />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>More Options</TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            onClick={onHangUp}
            className="size-11 p-0 bg-destructive hover:bg-destructive/80 px-8!"
          >
            <IconPhoneFilled className="text-foreground rotate-135" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Disconnect</TooltipContent>
      </Tooltip>
    </div>
  );

  // When watching screen: full view with sidebar
  if (isWatchingScreen && screenStream) {
    return (
      <div className="bg-main-primary flex flex-col h-full min-h-[400px]">
        <div className="flex-1 flex min-h-0 px-3 pt-3 pb-2">
          <ScreenWatchViewer
            screenStream={screenStream}
            isMuted={isMuted}
            isDeafened={isDeafened}
            onToggleMute={onToggleMute}
            onToggleDeafen={onToggleDeafen}
            onStopWatching={onStopWatchingScreen}
            participants={members}
            currentUser={currentUser}
            callConsumers={callConsumers}
          />
        </div>

        {/* Hidden audio elements */}
        {Object.entries(callConsumers).map(([pid, consumer]) => (
          <RemoteAudio key={pid} stream={consumer.combinedStream} />
        ))}

        {/* Controls bar */}
        {renderControlsBar()}
      </div>
    );
  }

  const useGridLayout = isGridView && !isScreenShareActive;

  return (
    <div className={cn(
      "bg-main-primary flex flex-col gap-8",
      useGridLayout ? "h-1/2 min-h-[200px] pt-3 pb-2" : "py-14"
    )}>
      {/* Participants grid */}
      <div className={cn(
        "flex-1 flex items-center justify-center min-h-0",
        useGridLayout ? "px-3" : "px-8"
      )}>
        <div className={cn(
          useGridLayout
            ? "grid auto-rows-fr gap-3 size-full grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
            : "flex flex-wrap items-center justify-center gap-4",
          !useGridLayout && (isScreenShareActive ? "max-w-3xl gap-3" : "max-w-2xl gap-6")
        )}>
          {isScreenShareActive ? (
            <>
              {/* Compact grid tiles during screen share */}
              <ScreenShareGridTile
                name={currentUser.displayName}
                profilePicture={currentUser.profilePicture}
                bannerColor={currentUser.profilePictureBannerColor}
                isMuted={isMuted}
                isDeafened={isDeafened}
                isSpeaking={isSpeaking}
                isSharing={isScreenSharing}
              />

              {members
                .filter((m) => m.info._id !== currentUser._id)
                .map((member) => {
                  const consumer = Object.values(callConsumers).find(
                    (c) => c.associatedUser._id === member.info._id
                  );
                  const isMemberSharing = screenShareInfo?.userId === member.info._id;

                  return (
                    <ScreenShareGridTile
                      key={member.info._id}
                      name={member.info.displayName}
                      profilePicture={member.info.profilePicture}
                      bannerColor={member.info.profilePictureBannerColor}
                      isMuted={consumer?.isMuted}
                      isDeafened={consumer?.isDeafened}
                      isSpeaking={consumer?.isSpeaking}
                      isSharing={isMemberSharing}
                      onWatchScreen={isMemberSharing ? onWatchScreen : undefined}
                    />
                  );
                })}
            </>
          ) : useGridLayout ? (
            <>
              {/* Grid view layout */}
              <GridParticipantTile
                name={currentUser.displayName}
                profilePicture={currentUser.profilePicture}
                bannerColor={currentUser.profilePictureBannerColor}
                status={CallStatus.Accepted}
                stream={localStream}
                isMuted={isMuted}
                isDeafened={isDeafened}
                isSpeaking={isSpeaking}
                isCurrentUser
                isVideoOn={isVideoEnabled}
              />

              {members
                .filter((m) => m.info._id !== currentUser._id)
                .map((member) => {
                  const consumerEntry = Object.entries(callConsumers).find(
                    ([, c]) => c.associatedUser._id === member.info._id
                  );
                  const consumer = consumerEntry?.[1];

                  return (
                    <GridParticipantTile
                      key={member.info._id}
                      name={member.info.displayName}
                      profilePicture={member.info.profilePicture}
                      bannerColor={member.info.profilePictureBannerColor}
                      status={member.callStatus}
                      stream={consumer?.combinedStream}
                      isMuted={consumer?.isMuted}
                      isDeafened={consumer?.isDeafened}
                      isSpeaking={consumer?.isSpeaking}
                      isVideoOn={consumer?.videoConsumer != null}
                    />
                  );
                })}
            </>
          ) : (
            <>
              {/* Normal layout without screen share */}
              <ParticipantTile
                name={currentUser.displayName}
                profilePicture={currentUser.profilePicture}
                bannerColor={currentUser.profilePictureBannerColor}
                status={CallStatus.Accepted}
                stream={localStream}
                isMuted={isMuted}
                isDeafened={isDeafened}
                isSpeaking={isSpeaking}
                isCurrentUser
                isVideoOn={isVideoEnabled}
              />

              {members
                .filter((m) => m.info._id !== currentUser._id)
                .map((member) => {
                  const consumerEntry = Object.entries(callConsumers).find(
                    ([, c]) => c.associatedUser._id === member.info._id
                  );
                  const consumer = consumerEntry?.[1];

                  return (
                    <ParticipantTile
                      key={member.info._id}
                      name={member.info.displayName}
                      profilePicture={member.info.profilePicture}
                      bannerColor={member.info.profilePictureBannerColor}
                      status={member.callStatus}
                      stream={consumer?.combinedStream}
                      isMuted={consumer?.isMuted}
                      isDeafened={consumer?.isDeafened}
                      isSpeaking={consumer?.isSpeaking}
                      isVideoOn={consumer?.videoConsumer != null}
                    />
                  );
                })}
            </>
          )}
        </div>
      </div>

      {/* Hidden audio elements for remote streams */}
      {Object.entries(callConsumers).map(([pid, consumer]) => (
        <RemoteAudio key={pid} stream={consumer.combinedStream} />
      ))}

      {/* Controls bar */}
      {renderControlsBar()}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent showCloseButton className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Camera Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {previewError ? (
                <p className="text-sm text-muted-foreground px-4 text-center">{previewError}</p>
              ) : previewStream ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full object-cover"
                />
              ) : (
                <p className="text-sm text-muted-foreground">Starting camera...</p>
              )}
            </div>
            <Select value={previewCameraId} onValueChange={setPreviewCameraId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                {videoInputDevices
                  .filter((d) => d.deviceId !== "default")
                  .map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
