/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Consumer } from "mediasoup-client/types";
import {
    CallConsumersFlag,
    CallMembers,
    CallState,
    CallStatus,
    CallType,
    ConsumerData,
    IncomingCall,
    ProducerKind,
} from "~/interfaces/call.interface";
import { FriendInterface, User } from "~/interfaces/user.interface";

const initialState: CallState = {
    currentActiveCalls: {},
    incomingCall: null,
    callConsumers: {},
};

const callSlice = createSlice({
    name: "call",
    initialState,
    reducers: {
        setIncomingCall: (state, action: PayloadAction<IncomingCall | null>) => {
            state.incomingCall = action.payload;
        },
        setIncomingCallStatus: (
            state,
            action: PayloadAction<{ callId: string; status: CallStatus }>
        ) => {
            if (state.incomingCall?.channel._id === action.payload.callId) {
                state.incomingCall.status = action.payload.status;
            }
        },
        removeCurrentActiveCalls: (
            state,
            action: PayloadAction<{ callId: string }>
        ) => {
            delete state.currentActiveCalls[action.payload.callId];
        },
        removeMemberFromCurrentActiveCalls: (
            state,
            action: PayloadAction<{ callId: string; memberId: string }>
        ) => {
            const call = state.currentActiveCalls[action.payload.callId];
            if (call && call.members) {
                const updatedMembers = call.members.filter(
                    (member) => member.info._id !== action.payload.memberId
                );

                if (updatedMembers.length === 0) {
                    delete state.currentActiveCalls[action.payload.callId];
                } else {
                    state.currentActiveCalls[action.payload.callId].members =
                        updatedMembers;
                }
            }
        },
        setCurrentActiveCalls: (
            state,
            action: PayloadAction<{
                callId: string[];
                members: User[] | FriendInterface[];
                currentUser?: User;
                isRejoining: boolean;
            }>
        ) => {
            // Iterate through each callId in the array
            action.payload.callId.forEach((callId) => {
                // Check if callId already exists in currentActiveCalls
                if (state.currentActiveCalls[callId]) {
                    // CallId exists, add new members to existing ones (avoiding duplicates)
                    const existingMembers = state.currentActiveCalls[callId].members;
                    // Add current user if not already present OR update their status if they're rejoining
                    if (action.payload.currentUser) {
                        const existingCurrentUserIndex = existingMembers.findIndex(
                            (member) => member.info._id === action.payload.currentUser?._id
                        );

                        if (existingCurrentUserIndex !== -1) {
                            // Current user exists, update their status to Accepted (rejoining)
                            existingMembers[existingCurrentUserIndex].callStatus =
                                CallStatus.Accepted;
                        } else {
                            // Current user doesn't exist, add them with Accepted status
                            existingMembers.push({
                                info: action.payload.currentUser,
                                callStatus: CallStatus.Accepted,
                            });
                        }
                    }

                    // Add other members if not already present (excluding current user)
                    action.payload.members.forEach((member) => {
                        const memberExists = existingMembers.some(
                            (existingMember) => existingMember.info._id === member._id
                        );
                        const isCurrentUser =
                            member._id === action.payload.currentUser?._id;

                        if (!memberExists && !isCurrentUser) {
                            existingMembers.push({
                                info: member,
                                callStatus: action.payload.isRejoining
                                    ? CallStatus.Accepted
                                    : CallStatus.Calling,
                            });
                        }
                    });
                } else {
                    // CallId doesn't exist, create new entry
                    const allMembers: CallMembers[] = [];

                    // Add current user with Accepted status
                    if (action.payload.currentUser) {
                        allMembers.push({
                            info: action.payload.currentUser,
                            callStatus: CallStatus.Accepted,
                        });
                    }

                    // Add other members with Calling status (filter out current user to avoid duplicates)
                    const otherMembers = action.payload.members.filter(
                        (member) => member._id !== action.payload.currentUser?._id
                    );

                    allMembers.push(
                        ...otherMembers.map((member) => ({
                            info: member,
                            callStatus:
                                member._id === state.incomingCall?.caller._id
                                    ? CallStatus.Accepted
                                    : CallStatus.Calling,
                        }))
                    );

                    state.currentActiveCalls[callId] = {
                        members: allMembers,
                    };
                }
            });
        },
        setUpdateCurrentActiveCalls: (
            state,
            action: PayloadAction<{
                callId: string;
                member: FriendInterface | FriendInterface[]; // Allow both string and array
                status: CallStatus;
            }>
        ) => {
            const call = state.currentActiveCalls[action.payload.callId];
            if (!call) return;

            // Handle both single string and array of strings
            const members = Array.isArray(action.payload.member)
                ? action.payload.member
                : [action.payload.member];

            // Update status for all specified members
            members.forEach((m) => {
                const foundedMember = call.members.find(
                    (member) => member.info._id === m._id
                );
                if (foundedMember) {
                    foundedMember.callStatus = action.payload.status;
                } else {
                    call.members.push({
                        info: action.payload.member as FriendInterface,
                        callStatus: action.payload.status,
                    });
                }
            });
        },
        removeCallFromCurrentActiveCalls: (
            state,
            action: PayloadAction<{ callId: string }>
        ) => {
            if (
                state.currentActiveCalls[action.payload.callId] &&
                (state.currentActiveCalls[action.payload.callId].members.length === 0 ||
                    state.currentActiveCalls[action.payload.callId].members.every(
                        (member) =>
                            member.callStatus === CallStatus.Ended ||
                            member.callStatus === CallStatus.Rejected ||
                            member.callStatus === CallStatus.Missed
                    ))
            ) {
                delete state.currentActiveCalls[action.payload.callId];
            }
        },

        forceRemoveCallFromCurrentActiveCalls: (
            state,
            action: PayloadAction<{ callId: string }>
        ) => {
            delete state.currentActiveCalls[action.payload.callId];
        },
        setCallConsumers: (
            state,
            action: PayloadAction<{
                consumers: Record<string, ConsumerData>;
            }>
        ) => {
            state.callConsumers = {
                ...state.callConsumers,
                ...action.payload.consumers,
            };
        },
        removeConsumer: (state, action: PayloadAction<{ pid: string }>) => {
            state.callConsumers = Object.fromEntries(
                Object.entries(state.callConsumers).filter(
                    ([key]) => key !== action.payload.pid
                )
            );
        },
        updateConsumerCallType: (
            state,
            action: PayloadAction<{ pid?: string; callType: CallType }>
        ) => {
            if (action.payload.pid) {
                const foundedConsumer = state.callConsumers[action.payload.pid];
                if (foundedConsumer) {
                    foundedConsumer.type =
                        action.payload.callType === CallType.Video
                            ? ProducerKind.Video
                            : ProducerKind.Audio;
                }
            }
        },
        updateConsumerMuteStatus: (
            state,
            action: PayloadAction<{ userId: string; isMuted: boolean }>
        ) => {
            const consumerEntry = Object.entries(state.callConsumers).find(
                ([_, consumer]) => consumer.associatedUser._id === action.payload.userId
            );
            if (consumerEntry) {
                const [pid] = consumerEntry;
                state.callConsumers[pid].isMuted = action.payload.isMuted;
            }
        },
        updateConsumerDeafenStatus: (
            state,
            action: PayloadAction<{ userId: string; isDeafened: boolean }>
        ) => {
            const consumerEntry = Object.entries(state.callConsumers).find(
                ([_, consumer]) => consumer.associatedUser._id === action.payload.userId
            );
            if (consumerEntry) {
                const [pid] = consumerEntry;
                state.callConsumers[pid].isDeafened = action.payload.isDeafened;
            }
        },
        updateConsumerSpeakingStatus: (
            state,
            action: PayloadAction<{ userId: string; isSpeaking: boolean }>
        ) => {
            const consumerEntry = Object.entries(state.callConsumers).find(
                ([_, consumer]) => consumer.associatedUser._id === action.payload.userId
            );
            if (consumerEntry) {
                const [pid] = consumerEntry;
                state.callConsumers[pid].isSpeaking = action.payload.isSpeaking;
            }
        },
        updateConsumerVideo: (
            state,
            action: PayloadAction<{
                userId: string;
                videoConsumer?: Consumer;
                videoStream?: MediaStream;
                isMuted: boolean;
                isDeafened: boolean;
                type: ProducerKind;
            }>
        ) => {
            const consumerEntry = Object.entries(state.callConsumers).find(
                ([_, consumer]) => consumer.associatedUser._id === action.payload.userId
            );

            if (consumerEntry) {
                const [pid, consumer] = consumerEntry;

                state.callConsumers[pid] = {
                    ...consumer,
                    videoConsumer: action.payload.videoConsumer ?? consumer.videoConsumer,
                    combinedStream: action.payload.videoStream ?? consumer.combinedStream,
                    type: action.payload.type,
                    isMuted: action.payload.isMuted,
                    isDeafened: action.payload.isDeafened,
                };
            }
        },
        removeConsumerVideo: (
            state,
            action: PayloadAction<{
                userId: string;
                audioOnlyStream: MediaStream;
                isMuted: boolean;
                isDeafened: boolean;
            }>
        ) => {
            // Find consumer by userId
            const consumerEntry = Object.entries(state.callConsumers).find(
                ([_, consumer]) => consumer.associatedUser._id === action.payload.userId
            );

            if (consumerEntry) {
                const [pid, consumer] = consumerEntry;

                // Update the consumer to remove video
                state.callConsumers[pid] = {
                    ...consumer,
                    videoConsumer: null,
                    combinedStream: action.payload.audioOnlyStream,
                    type: ProducerKind.Audio,
                    isMuted: action.payload.isMuted,
                    isDeafened: action.payload.isDeafened,
                };
            }
        },
    },
});

export const {
    setIncomingCall,
    setIncomingCallStatus,
    setCurrentActiveCalls,
    removeCurrentActiveCalls,
    removeMemberFromCurrentActiveCalls,
    removeCallFromCurrentActiveCalls,
    setUpdateCurrentActiveCalls,
    removeConsumerVideo,
    updateConsumerMuteStatus,
    updateConsumerDeafenStatus,
    updateConsumerSpeakingStatus,
    updateConsumerVideo,
    updateConsumerCallType,
    removeConsumer,
    setCallConsumers,
    forceRemoveCallFromCurrentActiveCalls,
} = callSlice.actions;
export default callSlice.reducer;
