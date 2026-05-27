"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import React from "react";
import { Device } from "mediasoup-client";
import { Producer, Transport } from "mediasoup-client/types";

import { useSocket } from "./use-socket";
import { useAppDispatch, useAppSelector } from "~/redux/hooks";
import {
  selectCallConsumers,
  selectCurrentActiveCalls,
  selectIncomingCall,
} from "~/redux/slices/call/call-selector";
import {
  setIncomingCall,
  setCurrentActiveCalls,
  setUpdateCurrentActiveCalls,
  forceRemoveCallFromCurrentActiveCalls,
  removeMemberFromCurrentActiveCalls,
  setCallConsumers,
  removeConsumer,
  updateConsumerMuteStatus,
  updateConsumerDeafenStatus,
  updateConsumerSpeakingStatus,
  updateConsumerVideo,
  removeConsumerVideo,
  updateConsumerCallType,
} from "~/redux/slices/call/call-slice";
import {
  CallStatus,
  CallType,
  IncomingCall,
  JoinRoomResponse,
  ProducerKind,
  ScreenShareInfo,
} from "~/interfaces/call.interface";
import { FriendInterface, User } from "~/interfaces/user.interface";
import { Channel } from "~/interfaces/channels.interface";
import {
  createProducerTransport,
  createProducer,
  requestTransportToConsume,
  createConsumer,
  createConsumerTransport,
} from "~/lib/mediasoup";

export interface CallContextValue {
  isInCall: boolean;
  activeCallId: string | null;
  callType: CallType | null;
  localStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  incomingCall: IncomingCall | null;
  callConsumers: ReturnType<typeof selectCallConsumers>;
  currentActiveCalls: ReturnType<typeof selectCurrentActiveCalls>;

  isScreenSharing: boolean;
  screenShareInfo: ScreenShareInfo | null;
  isWatchingScreen: boolean;
  screenStream: MediaStream | null;

  startCall: (channel: Channel | null, callType: CallType, members: FriendInterface[]) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  watchScreen: () => Promise<void>;
  stopWatchingScreen: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

interface CallProviderProps {
  currentUser: User;
  children: ReactNode;
}

export function CallProvider({ currentUser, children }: CallProviderProps) {
  const { socket } = useSocket();
  const dispatch = useAppDispatch();

  const incomingCall = useAppSelector(selectIncomingCall);
  const callConsumers = useAppSelector(selectCallConsumers);
  const currentActiveCalls = useAppSelector(selectCurrentActiveCalls);

  const [isInCall, setIsInCall] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareInfo, setScreenShareInfo] = useState<ScreenShareInfo | null>(null);
  const [isWatchingScreen, setIsWatchingScreen] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const producerTransportRef = useRef<Transport | null>(null);
  const consumerTransportRef = useRef<Transport | null>(null);
  const audioProducerRef = useRef<Producer | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);
  const screenProducerRef = useRef<Producer | null>(null);
  const screenConsumerRef = useRef<import("mediasoup-client/types").Consumer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const joiningRef = useRef(false);
  const callConsumersRef = useRef(callConsumers);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingAnimFrameRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const screenShareInfoRef = useRef<ScreenShareInfo | null>(null);

  useEffect(() => {
    callConsumersRef.current = callConsumers;
  }, [callConsumers]);

  useEffect(() => {
    screenShareInfoRef.current = screenShareInfo;
  }, [screenShareInfo]);

  const stopSpeakingDetection = useCallback(() => {
    if (speakingAnimFrameRef.current != null) {
      cancelAnimationFrame(speakingAnimFrameRef.current);
      speakingAnimFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const startSpeakingDetection = useCallback((stream: MediaStream, sock: typeof socket, callId: string) => {
    stopSpeakingDetection();

    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const THRESHOLD = 15;

    const detect = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      const speaking = avg > THRESHOLD;

      if (speaking !== isSpeakingRef.current) {
        isSpeakingRef.current = speaking;
        setIsSpeaking(speaking);
        sock?.emit("userSpeakingStatus", { isSpeaking: speaking });
      }
      speakingAnimFrameRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, [stopSpeakingDetection]);

  const cleanup = useCallback(() => {
    stopSpeakingDetection();

    audioProducerRef.current?.close();
    videoProducerRef.current?.close();
    screenProducerRef.current?.close();
    screenConsumerRef.current?.close();
    producerTransportRef.current?.close();
    consumerTransportRef.current?.close();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    audioProducerRef.current = null;
    videoProducerRef.current = null;
    screenProducerRef.current = null;
    screenConsumerRef.current = null;
    producerTransportRef.current = null;
    consumerTransportRef.current = null;
    deviceRef.current = null;
    localStreamRef.current = null;
    joiningRef.current = false;

    setLocalStream(null);
    setIsInCall(false);
    setActiveCallId(null);
    setCallType(null);
    setIsMuted(false);
    setIsDeafened(false);
    setIsVideoEnabled(false);
    setIsSpeaking(false);
    setIsScreenSharing(false);
    setScreenShareInfo(null);
    setIsWatchingScreen(false);
    setScreenStream(null);
  }, [stopSpeakingDetection]);

  const getMediaStream = useCallback(async (video: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    const constraints: MediaStreamConstraints = {
      audio: true,
      video: video
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
        : false,
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }, []);

  const joinRoom = useCallback(
    async (channelId: string, type: CallType) => {
      if (!socket) throw new Error("Socket not connected");
      if (joiningRef.current) return;
      joiningRef.current = true;

      const isVideo = type === CallType.Video;
      let stream: MediaStream;
      try {
        stream = await getMediaStream(isVideo);
      } catch (err) {
        joiningRef.current = false;
        console.error("Failed to acquire media device:", err);
        throw err;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(isVideo);

      const joinResponse: JoinRoomResponse = await socket.emitWithAck("joinRoom", {
        channelId,
        callType: type,
      });

      const device = new Device();
      await device.load({ routerRtpCapabilities: joinResponse.routerRtpCapabilities });
      deviceRef.current = device;

      const producerTransport = await createProducerTransport(socket, device);
      producerTransportRef.current = producerTransport;

      const producers = await createProducer(stream, producerTransport, isVideo, true);
      if (producers) {
        audioProducerRef.current = producers.audioProducer ?? null;
        videoProducerRef.current = producers.videoProducer ?? null;
      }

      if (!joinResponse.newRoom) {
        const setTransport: React.Dispatch<React.SetStateAction<Transport | null>> = (value) => {
          const resolved = typeof value === "function" ? value(consumerTransportRef.current) : value;
          consumerTransportRef.current = resolved;
        };

        await requestTransportToConsume(
          joinResponse,
          socket,
          device,
          dispatch,
          isVideo,
          setTransport
        );
      }

      setIsInCall(true);
      setActiveCallId(channelId);
      setCallType(type);
      joiningRef.current = false;

      if (socket && stream) {
        startSpeakingDetection(stream, socket, channelId);
      }

      return joinResponse;
    },
    [socket, dispatch, getMediaStream, startSpeakingDetection]
  );

  const startCall = useCallback(
    async (channel: Channel | null, type: CallType, members: FriendInterface[]) => {
      if (!channel) return;
      if (!socket || !currentUser) return;

      await joinRoom(channel._id, type);

      dispatch(
        setCurrentActiveCalls({
          callId: [channel._id],
          members,
          currentUser,
          isRejoining: false,
        })
      );
      socket.emit("callUser", {
        channelId: channel._id,
        callType: type,
        members: members.map((m) => m._id),
      });
    },
    [socket, currentUser, dispatch, joinRoom]
  );

  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall || !currentUser) return;

    const channelId = incomingCall.channel._id;
    const type = incomingCall.callType;

    socket.emit("acceptCall", { channelId });

    await joinRoom(channelId, type);

    dispatch(
      setCurrentActiveCalls({
        callId: [channelId],
        members: incomingCall.channel.members,
        currentUser,
        isRejoining: true,
      })
    );
    dispatch(setIncomingCall(null));
  }, [socket, incomingCall, currentUser, dispatch, joinRoom]);

  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    socket.emit("rejectCall", { channelId: incomingCall.channel._id });
    dispatch(setIncomingCall(null));
  }, [socket, incomingCall, dispatch]);

  const hangUp = useCallback(() => {
    if (!socket || !activeCallId) return;

    socket.emit("leaveRoom", { channelId: activeCallId });

    Object.entries(callConsumers).forEach(([pid, consumer]) => {
      consumer.audioConsumer?.close();
      consumer.videoConsumer?.close();
      consumer.consumerTransport?.close();
      dispatch(removeConsumer({ pid }));
    });

    dispatch(forceRemoveCallFromCurrentActiveCalls({ callId: activeCallId }));
    cleanup();
  }, [socket, activeCallId, callConsumers, dispatch, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    // If deafened, un-deafen instead of just toggling mute
    if (isDeafened) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);

      if (!audioTrack.enabled) {
        stopSpeakingDetection();
      } else if (socket && activeCallId) {
        startSpeakingDetection(localStreamRef.current!, socket, activeCallId);
      }

      if (socket && activeCallId) {
        socket.emit("toggleMute", {
          channelId: activeCallId,
          isMuted: !audioTrack.enabled,
        });
      }
    }
  }, [socket, activeCallId, isDeafened, stopSpeakingDetection, startSpeakingDetection]);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);

    // Deafen also mutes the mic
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !newDeafened;
      }
    }
    setIsMuted(newDeafened);

    // Stop/start speaking detection based on deafen state
    if (newDeafened) {
      stopSpeakingDetection();
    } else if (localStreamRef.current && socket && activeCallId) {
      startSpeakingDetection(localStreamRef.current, socket, activeCallId);
    }

    // Pause/resume all consumer audio (hearing others)
    Object.values(callConsumers).forEach((consumer) => {
      if (consumer.audioConsumer) {
        if (newDeafened) {
          consumer.audioConsumer.pause();
        } else {
          consumer.audioConsumer.resume();
        }
      }
    });

    if (socket && activeCallId) {
      socket.emit("toggleDeafen", {
        channelId: activeCallId,
        isDeafened: newDeafened,
      });
    }
  }, [isDeafened, callConsumers, socket, activeCallId, stopSpeakingDetection, startSpeakingDetection]);

  const toggleVideo = useCallback(async () => {
    if (!socket || !activeCallId || !deviceRef.current || !producerTransportRef.current) return;

    if (isVideoEnabled && videoProducerRef.current) {
      videoProducerRef.current.close();
      videoProducerRef.current = null;

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      }

      setIsVideoEnabled(false);
      socket.emit("toggleVideo", { channelId: activeCallId, videoEnabled: false });
    } else {
      let videoStream: MediaStream;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
      } catch (err) {
        console.error("Failed to acquire video device:", err);
        return;
      }

      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack && producerTransportRef.current) {
        const videoProducer = await producerTransportRef.current.produce({ track: videoTrack });
        videoProducerRef.current = videoProducer;

        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }

        setIsVideoEnabled(true);
        socket.emit("toggleVideo", { channelId: activeCallId, videoEnabled: true });
      }
    }
  }, [socket, activeCallId, isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!socket || !activeCallId || !deviceRef.current || !producerTransportRef.current) return;

    if (isScreenSharing && screenProducerRef.current) {
      screenProducerRef.current.close();
      screenProducerRef.current = null;
      setIsScreenSharing(false);
      socket.emit("stopScreenShare", { channelId: activeCallId });
    } else {
      let displayStream: MediaStream;
      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        });
      } catch {
        return;
      }

      const screenTrack = displayStream.getVideoTracks()[0];
      if (screenTrack && producerTransportRef.current) {
        screenTrack.onended = () => {
          screenProducerRef.current?.close();
          screenProducerRef.current = null;
          setIsScreenSharing(false);
          socket.emit("stopScreenShare", { channelId: activeCallId });
        };

        const screenProducer = await producerTransportRef.current.produce({
          track: screenTrack,
          appData: { type: "screen" },
        });
        screenProducerRef.current = screenProducer;
        setIsScreenSharing(true);
      }
    }
  }, [socket, activeCallId, isScreenSharing]);

  const watchScreen = useCallback(async () => {
    const info = screenShareInfoRef.current;
    if (!socket || !deviceRef.current || !info) return;

    const existingEntry = Object.entries(callConsumersRef.current).find(
      ([, c]) => c.associatedUser._id === info.userId
    );

    if (!existingEntry) return;

    const [, existingConsumer] = existingEntry;

    try {
      const screenConsumer = await createConsumer(
        existingConsumer.consumerTransport,
        info.screenProducerId,
        deviceRef.current,
        socket,
        ProducerKind.Screen
      );

      if (screenConsumer) {
        screenConsumerRef.current = screenConsumer;
        setScreenStream(new MediaStream([screenConsumer.track]));
        setIsWatchingScreen(true);
      }
    } catch (err) {
      console.error("Failed to consume screen share:", err);
    }
  }, [socket]);

  const stopWatchingScreen = useCallback(() => {
    if (screenConsumerRef.current) {
      screenConsumerRef.current.close();
      screenConsumerRef.current = null;
    }
    setScreenStream(null);
    setIsWatchingScreen(false);
  }, []);

  // --- Socket event listeners ---

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: {
      channel: Channel;
      callType: CallType;
      caller: FriendInterface;
    }) => {
      dispatch(
        setIncomingCall({
          channel: data.channel,
          callType: data.callType,
          caller: data.caller,
          status: CallStatus.Calling,
        })
      );
    };

    const handleCallAccepted = (data: {
      channelId: string;
      user: FriendInterface;
    }) => {
      dispatch(
        setUpdateCurrentActiveCalls({
          callId: data.channelId,
          member: data.user,
          status: CallStatus.Accepted,
        })
      );
    };

    const handleCallRejected = (data: {
      channelId: string;
      user: FriendInterface;
    }) => {
      dispatch(
        setUpdateCurrentActiveCalls({
          callId: data.channelId,
          member: data.user,
          status: CallStatus.Rejected,
        })
      );
    };

    const handleCallEnded = (data: { channelId: string }) => {
      if (data.channelId === activeCallId) {
        Object.entries(callConsumersRef.current).forEach(([pid, consumer]) => {
          consumer.audioConsumer?.close();
          consumer.videoConsumer?.close();
          consumer.consumerTransport?.close();
          dispatch(removeConsumer({ pid }));
        });
        dispatch(forceRemoveCallFromCurrentActiveCalls({ callId: data.channelId }));
        cleanup();
      }
      dispatch(setIncomingCall(null));
    };

    const handleUserLeft = (data: { channelId: string; userId: string; audioPid: string }) => {
      if (data.audioPid && callConsumersRef.current[data.audioPid]) {
        const consumer = callConsumersRef.current[data.audioPid];
        consumer.audioConsumer?.close();
        consumer.videoConsumer?.close();
        consumer.consumerTransport?.close();
        dispatch(removeConsumer({ pid: data.audioPid }));
      }
      dispatch(removeMemberFromCurrentActiveCalls({
        callId: data.channelId,
        memberId: data.userId,
      }));
    };

    const handleNewProducer = async (data: {
      producerId: string;
      kind: ProducerKind;
      userId: string;
      user: User;
    }) => {
      if (!deviceRef.current || !socket) return;

      if (data.kind === ProducerKind.Audio) {
        const consumerTransportParam = await socket.emitWithAck("requestTransport", {
          type: "consumer",
          audioPid: data.producerId,
        });

        const transport = createConsumerTransport(
          consumerTransportParam,
          deviceRef.current,
          socket,
          data.producerId
        );
        consumerTransportRef.current = transport;

        await new Promise((resolve) => setTimeout(resolve, 100));

        const audioConsumer = await createConsumer(
          transport,
          data.producerId,
          deviceRef.current,
          socket,
          ProducerKind.Audio
        );

        if (audioConsumer) {
          const combinedStream = new MediaStream([audioConsumer.track]);
          dispatch(
            setCallConsumers({
              consumers: {
                [data.producerId]: {
                  combinedStream,
                  associatedUser: data.user,
                  consumerTransport: transport,
                  audioConsumer,
                  videoConsumer: null,
                  type: ProducerKind.Audio,
                  isMuted: false,
                  isDeafened: false,
                  isSpeaking: false,
                },
              },
            })
          );
        }
      } else if (data.kind === ProducerKind.Video) {
        const existingEntry = Object.entries(callConsumersRef.current).find(
          ([, c]) => c.associatedUser._id === data.userId
        );

        if (existingEntry) {
          const [pid, existingConsumer] = existingEntry;

          const videoConsumer = await createConsumer(
            existingConsumer.consumerTransport,
            data.producerId,
            deviceRef.current,
            socket,
            ProducerKind.Video
          );

          if (videoConsumer) {
            const combinedStream = new MediaStream([
              existingConsumer.audioConsumer.track,
              videoConsumer.track,
            ]);

            dispatch(
              updateConsumerVideo({
                userId: data.userId,
                videoConsumer,
                videoStream: combinedStream,
                isMuted: existingConsumer.isMuted,
                isDeafened: existingConsumer.isDeafened,
                type: ProducerKind.Video,
              })
            );
          }
        }
      }
    };

    const handleProducerClosed = (data: { producerId: string; kind: ProducerKind; userId: string }) => {
      if (data.kind === ProducerKind.Video) {
        const entry = Object.entries(callConsumersRef.current).find(
          ([, c]) => c.associatedUser._id === data.userId
        );
        if (entry) {
          const [, consumer] = entry;
          consumer.videoConsumer?.close();

          const audioOnlyStream = new MediaStream([consumer.audioConsumer.track]);
          dispatch(
            removeConsumerVideo({
              userId: data.userId,
              audioOnlyStream,
              isMuted: consumer.isMuted,
              isDeafened: consumer.isDeafened,
            })
          );
        }
      }
    };

    const handleUserMuted = (data: { userId: string; isMuted: boolean }) => {
      dispatch(updateConsumerMuteStatus({ userId: data.userId, isMuted: data.isMuted }));
    };

    const handleUserDeafened = (data: { userId: string; isDeafened: boolean }) => {
      dispatch(updateConsumerDeafenStatus({ userId: data.userId, isDeafened: data.isDeafened }));
    };

    const handleUserSpeaking = (data: { userId: string; isSpeaking: boolean }) => {
      dispatch(updateConsumerSpeakingStatus({ userId: data.userId, isSpeaking: data.isSpeaking }));
    };

    const handleCallTypeChanged = (data: { userId: string; callType: CallType }) => {
      const entry = Object.entries(callConsumersRef.current).find(
        ([, c]) => c.associatedUser._id === data.userId
      );
      if (entry) {
        const [pid] = entry;
        dispatch(updateConsumerCallType({ pid, callType: data.callType }));
      }
    };

    const handleScreenShareStarted = (data: {
      userId: string;
      user: User;
      screenProducerId: string;
    }) => {
      setScreenShareInfo({
        userId: data.userId,
        user: data.user,
        screenProducerId: data.screenProducerId,
      });
    };

    const handleScreenShareStopped = () => {
      setScreenShareInfo(null);
      if (screenConsumerRef.current) {
        screenConsumerRef.current.close();
        screenConsumerRef.current = null;
      }
      setScreenStream(null);
      setIsWatchingScreen(false);
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("userLeftCall", handleUserLeft);
    socket.on("newProducer", handleNewProducer);
    socket.on("producerClosed", handleProducerClosed);
    socket.on("userMuted", handleUserMuted);
    socket.on("userDeafened", handleUserDeafened);
    socket.on("userSpeaking", handleUserSpeaking);
    socket.on("callTypeChanged", handleCallTypeChanged);
    socket.on("screenShareStarted", handleScreenShareStarted);
    socket.on("screenShareStopped", handleScreenShareStopped);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
      socket.off("userLeftCall", handleUserLeft);
      socket.off("newProducer", handleNewProducer);
      socket.off("producerClosed", handleProducerClosed);
      socket.off("userMuted", handleUserMuted);
      socket.off("userDeafened", handleUserDeafened);
      socket.off("userSpeaking", handleUserSpeaking);
      socket.off("callTypeChanged", handleCallTypeChanged);
      socket.off("screenShareStarted", handleScreenShareStarted);
      socket.off("screenShareStopped", handleScreenShareStopped);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeCallId, dispatch, cleanup]);

  useEffect(() => {
    return () => {
      if (isInCall) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: CallContextValue = {
    isInCall,
    activeCallId,
    callType,
    localStream,
    isMuted,
    isDeafened,
    isVideoEnabled,
    isSpeaking,
    incomingCall,
    callConsumers,
    currentActiveCalls,

    isScreenSharing,
    screenShareInfo,
    isWatchingScreen,
    screenStream,

    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    watchScreen,
    stopWatchingScreen,
  };

  return React.createElement(CallContext.Provider, { value }, children);
}

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
