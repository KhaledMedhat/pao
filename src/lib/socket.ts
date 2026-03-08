import { io, Socket } from "socket.io-client";
import { getCookie } from "~/app/actions";

class SocketService {
  private socket: Socket | null = null;
  private isInitialized = false;
  private isRefreshingAuth = false;

  private async getAccessToken() {
    return await getCookie("access_token");
  }

  private isAuthErrorMessage(message: string) {
    const lowered = message.toLowerCase();
    return lowered.includes("jwt") || lowered.includes("unauthorized") || lowered.includes("token");
  }

  private async refreshSocketAuthAndReconnect() {
    if (!this.socket || this.isRefreshingAuth) {
      return;
    }

    this.isRefreshingAuth = true;
    try {
      const latestAccessToken = await this.getAccessToken();
      if (!latestAccessToken) {
        return;
      }

      this.socket.auth = { token: latestAccessToken };

      if (!this.socket.connected) {
        this.socket.connect();
      }
    } finally {
      this.isRefreshingAuth = false;
    }
  }

  async initialize() {
    if (this.isInitialized && this.socket?.connected) {
      return this.socket;
    }

    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      console.warn("No access token, cannot initialize socket");
      return null;
    }

    if (this.socket && !this.socket.connected) {
      this.socket.auth = { token: accessToken };
      this.socket.connect();
      return this.socket;
    }

    this.socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/signaling`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      if (this.isAuthErrorMessage(error.message)) {
        void this.refreshSocketAuthAndReconnect();
      }
    });

    this.isInitialized = true;
    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
export const socketService = new SocketService();
