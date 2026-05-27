import { Consumer, RtpCapabilities, Transport } from "mediasoup-client/types";
import { FriendInterface, User } from "./user.interface";
import { Channel } from "./channels.interface";

export enum ProducerTransportType {
    Producer = "producer",
    Consumer = "consumer",
}

export interface CallMembers {
    info: User | FriendInterface;
    callStatus: CallStatus;
}

export enum CallConsumersFlag {
    Add = "add",
    Remove = "remove",
}

export interface CallState {
    currentActiveCalls: Record<string, { members: CallMembers[] }>;
    incomingCall: IncomingCall | null;
    callConsumers: Record<string, ConsumerData>;
}

export enum CallStatus {
    Calling = "calling",
    Accepted = "accepted",
    Ended = "ended",
    Rejected = "rejected",
    Missed = "missed",
}

export enum CallType {
    Voice = "voice",
    Video = "video",
}

export interface IncomingCall {
    channel: Channel;
    callType: CallType;
    caller: FriendInterface;
    status: CallStatus;
}

export interface CurrentCall {
    callId: string;
    callType: CallType;
    callee: FriendInterface[];
    acceptedCallee: FriendInterface[];
    rejectedCallee: FriendInterface[];
    missedCallee: FriendInterface[];
}

export interface JoinRoomResponse {
    associatedUsers: User[];
    routerRtpCapabilities: RtpCapabilities;
    newRoom: boolean;
    audioPidsToCreate: string[];
    videoPidsToCreate: string[];
}

export enum ProducerKind {
    Audio = "audio",
    Video = "video",
    Screen = "screen",
}

export interface ScreenShareInfo {
    userId: string;
    user: User | FriendInterface;
    screenProducerId: string;
}

export interface ConsumerData {
    combinedStream: MediaStream;
    associatedUser: User;
    consumerTransport: Transport;
    audioConsumer: Consumer;
    videoConsumer: Consumer | null;
    type: ProducerKind;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
}
