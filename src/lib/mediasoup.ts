import { Device } from "mediasoup-client";
import { Transport, TransportOptions } from "mediasoup-client/types";
import { Socket } from "socket.io-client";
import React from "react";

import { JoinRoomResponse, ProducerKind, ProducerTransportType } from "~/interfaces/call.interface";
import { AppDispatch } from "~/redux/store";
import { setCallConsumers } from "~/redux/slices/call/call-slice";

export async function createProducerTransport(
    socket: Socket,
    device: Device
): Promise<Transport> {
    console.log("createProducerTransport");
    const producerTransportParams = await socket.emitWithAck("requestTransport", {
        type: ProducerTransportType.Producer,
    });
    const producerTransport = device.createSendTransport(producerTransportParams);
    console.log(producerTransportParams, "producerTransportParams");
    producerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, error) => {
            console.log(dtlsParameters, "dtlsParameters on connect");
            const connectResponse = await socket.emitWithAck("connectTransport", {
                dtlsParameters,
                type: ProducerTransportType.Producer,
            });
            // console.log(connectResponse, "connect Response is returned");
            if (connectResponse === "success") {
                callback();
            } else {
                error(new Error("Failed to connect transport"));
            }
        }
    );

    producerTransport.on("produce", async (parameters, callback, error) => {
        try {
            const kind = parameters.appData?.type === "screen" ? "screen" : parameters.kind;
            const produceResponse = await socket.emitWithAck("startProducing", {
                kind,
                rtpParameters: parameters.rtpParameters,
            });
            if (produceResponse === "error") {
                error(new Error("Failed to start producing"));
            } else {
                callback({ id: produceResponse });
            }
        } catch {
            error(new Error("Socket error during produce"));
        }
    });
    console.log(producerTransport, "producerTransport");

    return producerTransport;
}

export async function createProducer(
    localStream: MediaStream,
    producerTransport: Transport,
    video: boolean,
    audio: boolean
) {
    console.log("createProducer");
    // get audio and video track so we can produce them
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    // ✅ FIX: Always create audio producer first, then video if needed
    try {
        let audioProducer;
        let videoProducer;

        // Always create audio producer first
        if (audio && audioTrack) {
            audioProducer = await producerTransport.produce({
                track: audioTrack,
            });
        }

        // Then create video producer if needed
        if (video && videoTrack) {
            // Wait a bit between producers to avoid race conditions
            await new Promise((resolve) => setTimeout(resolve, 100));
            videoProducer = await producerTransport.produce({
                track: videoTrack,
            });
        }

        return { videoProducer, audioProducer };
    } catch {
        return null;
    }
}

export async function requestTransportToConsume(
    consumeData: JoinRoomResponse,
    socket: Socket,
    device: Device,
    dispatch: AppDispatch,
    remoteHasVideo: boolean,
    setConsumerTransport: React.Dispatch<React.SetStateAction<Transport | null>>
) {
    console.log("🎥 requestTransportToConsume ENTRY:", {
        audioPids: consumeData.audioPidsToCreate,
        videoPids: consumeData.videoPidsToCreate,
        remoteHasVideo,
        associatedUsersCount: consumeData.associatedUsers?.length || 0,
    });

    if (
        !consumeData.audioPidsToCreate ||
        consumeData.audioPidsToCreate.length === 0
    ) {
        return;
    }

    // Process each user that needs to be consumed
    for (let idx = 0; idx < consumeData.audioPidsToCreate.length; idx++) {
        const audioPid = consumeData.audioPidsToCreate[idx];
        const videoPid = consumeData.videoPidsToCreate?.[idx];

        console.log(`🎥 Processing consumer ${idx}:`, {
            audioPid,
            videoPid,
            remoteHasVideo,
            associatedUser: consumeData.associatedUsers[idx]?.username || "unknown",
        });

        try {
            // Create consumer transport
            console.log("🚛 Creating consumer transport...");
            const consumerTransportParam = await socket.emitWithAck(
                "requestTransport",
                {
                    type: ProducerTransportType.Consumer,
                    audioPid,
                }
            );

            console.log(
                "🚛 Consumer transport params received:",
                !!consumerTransportParam
            );

            const consumerTransport = createConsumerTransport(
                consumerTransportParam,
                device,
                socket,
                audioPid
            );
            setConsumerTransport(consumerTransport);

            // Wait for transport to be ready
            await new Promise((resolve) => setTimeout(resolve, 100));
            console.log("remoteHasVideo && videoPid", remoteHasVideo, videoPid);
            // Continue with consumer creation...
            if (remoteHasVideo && videoPid) {
                console.log("🎥 Creating video + audio consumers");
                const [videoConsumer, audioConsumer] = await Promise.all([
                    createConsumer(
                        consumerTransport,
                        videoPid,
                        device,
                        socket,
                        ProducerKind.Video
                    ),
                    createConsumer(
                        consumerTransport,
                        audioPid,
                        device,
                        socket,
                        ProducerKind.Audio
                    ),
                ]);

                if (!videoConsumer || !audioConsumer) {
                    console.log("❌ Failed to create video consumers");
                    return;
                }

                const combinedStream = new MediaStream([
                    audioConsumer.track,
                    videoConsumer.track,
                ]);

                console.log("✅ Created video consumer stream:", combinedStream);

                dispatch(
                    setCallConsumers({
                        consumers: {
                            [audioPid]: {
                                combinedStream,
                                associatedUser: consumeData.associatedUsers[idx],
                                consumerTransport,
                                audioConsumer,
                                videoConsumer,
                                type: ProducerKind.Video,
                                isMuted: false,
                                isDeafened: false,
                                isSpeaking: false,
                            },
                        },
                    })
                );
            } else {
                const [audioConsumer] = await Promise.all([
                    createConsumer(
                        consumerTransport,
                        audioPid,
                        device,
                        socket,
                        ProducerKind.Audio
                    ),
                ]);

                if (!audioConsumer) {
                    return;
                }

                const combinedStream = new MediaStream([audioConsumer.track]);

                dispatch(
                    setCallConsumers({
                        consumers: {
                            [audioPid]: {
                                combinedStream,
                                associatedUser: consumeData.associatedUsers[idx],
                                consumerTransport,
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
        } catch (error) {
            console.error("❌ Error in requestTransportToConsume:", error);
        }
    }
}

export async function createConsumer(
    consumerTransport: Transport,
    pid: string,
    device: Device,
    socket: Socket,
    kind: ProducerKind
) {
    console.log("🎧 createConsumer called:", {
        pid,
        kind,
        transportClosed: consumerTransport.closed,
        transportState: consumerTransport.connectionState,
    });

    // ✅ MODIFIED: Allow "new" state (connection might happen during consume)
    if (consumerTransport.closed) {
        console.error("❌ Cannot consume: transport is closed");
        return undefined;
    }

    try {
        console.log("🎧 Requesting consumeMedia from server...");
        const consumerParams = await socket.emitWithAck("consumeMedia", {
            rtpCapabilities: device.rtpCapabilities,
            kind,
            producerId: pid,
        });

        console.log("🎧 Server response:", consumerParams);

        if (consumerParams === "cannotConsume") {
            console.error("❌ Server says cannot consume:", { pid, kind });
            return undefined;
        } else if (consumerParams === "consumeFailed") {
            console.error("❌ Server says consume failed:", { pid, kind });
            return undefined;
        } else if (!consumerParams || typeof consumerParams !== "object") {
            console.error("❌ Invalid consumer params:", consumerParams);
            return undefined;
        } else {
            console.log("🎧 Creating consumer with params...", {
                transportStateBefore: consumerTransport.connectionState,
            });

            const consumer = await consumerTransport.consume(consumerParams);

            console.log("✅ Consumer created successfully:", {
                id: consumer.id,
                kind: consumer.kind,
                transportStateAfter: consumerTransport.connectionState,
            });

            return consumer;
        }
    } catch (error) {
        console.error("❌ Error in createConsumer:", error);
        console.error("Transport final state:", {
            closed: consumerTransport.closed,
            connectionState: consumerTransport.connectionState,
        });
        return undefined;
    }
}

export function createConsumerTransport(
    consumerTransportParam: TransportOptions,
    device: Device,
    socket: Socket,
    audioPid: string
) {
    console.log("createConsumerTransport");
    const consumerTransport = device.createRecvTransport(consumerTransportParam);
    let isConnecting = false; // Add connection state tracking

    //there a  state there in the event listener
    consumerTransport.on("connectionstatechange", async () => {
        console.log("connectionstatechange");
    });

    consumerTransport.on("icegatheringstatechange", async () => {
        console.log("iceconnectionstatechange");
    });
    consumerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, error) => {
            // Prevent multiple connection attempts
            if (isConnecting || consumerTransport.closed) {
                callback();
                return;
            }

            isConnecting = true;

            try {
                const connectResponse = await socket.emitWithAck("connectTransport", {
                    dtlsParameters,
                    type: ProducerTransportType.Consumer,
                    audioPid,
                });
                // console.log(connectResponse, "connectResponse");

                if (connectResponse === "success") {
                    callback();
                } else {
                    error(new Error("Failed to connect transport"));
                }
            } catch {
                error(new Error("Error"));
            } finally {
                isConnecting = false;
            }
        }
    );

    return consumerTransport;
}
