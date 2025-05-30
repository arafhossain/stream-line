import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { IMessageData } from "../models/IMessageData";

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: IMessageData) => void;
  registerMessageHandler: (callback: (message: IMessageData) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlerRef = useRef<((message: any) => void) | null>(null);

  const sendMessage = async (message: IMessageData) => {
    try {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        console.log("Sending message: ", message);
        socketRef.current.send(JSON.stringify(message));
      } else console.log("Cant send message, socket not ready");
    } catch (err) {
      console.log("Error sending message: ", err);
    }
  };

  const registerMessageHandler = (
    callback: (message: IMessageData) => void
  ) => {
    messageHandlerRef.current = callback;
  };

  useEffect(() => {
    const connectWebSocket = () => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.close();
      }

      socketRef.current = new WebSocket("ws://localhost:8080");

      socketRef.current.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
      };

      socketRef.current.onmessage = null;
      socketRef.current.onmessage = (event) => {
        const messageData: IMessageData = JSON.parse(event.data);
        console.log("On message: ", messageData);

        if (messageHandlerRef.current) {
          messageHandlerRef.current(messageData);
        }
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      console.log("Cleaning up WebSocket connection");
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.close();
        setIsConnected(false);
        socketRef.current = null;
        messageHandlerRef.current = null;
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        sendMessage,
        registerMessageHandler,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
