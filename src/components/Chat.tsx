import { useEffect, useRef, useState } from "react";
import "./Chat.css";
import { IMessageData } from "../models/IMessageData";

export default function Chat() {
  const [username, setUsername] = useState(""); // Username state
  const [hasEnteredChat, setHasEnteredChat] = useState(false); // Tracks if user has entered the chat

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<IMessageData[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null); // Ref to track the last message

  // Scroll to the latest message whenever the messages array changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Prevent multiple WebSocket connections
    if (socketRef.current) return;

    if (hasEnteredChat) {
      socketRef.current = new WebSocket("ws://localhost:8080");

      socketRef.current.onopen = () => {
        console.log("WebSocket connection established");
      };

      socketRef.current.onmessage = (event) => {
        const newMessage: IMessageData = JSON.parse(event.data);

        const localTime = new Date(newMessage.timestamp).toLocaleString(
          "en-US",
          {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }
        );

        setMessages((prevMessages) => [
          ...prevMessages,
          { ...newMessage, timestamp: localTime },
        ]);
      };

      // Clean up the WebSocket connection when the component unmounts
      return () => {
        if (socketRef.current) {
          socketRef.current?.close();
          socketRef.current = null;
        }
      };
    }
  }, [hasEnteredChat]);

  // Function to handle sending the message
  const handleSendMessage = () => {
    if (socketRef.current && message.trim() !== "") {
      const messageData = {
        user: username,
        text: message,
        timestamp: new Date().toISOString(),
      };
      socketRef.current.send(JSON.stringify(messageData));
      setMessage("");
    }
  };

  if (!hasEnteredChat) {
    return (
      <div className="username-entry">
        <h2>Enter a Username</h2>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === "Enter") setHasEnteredChat(true);
          }}
        />
        <button onClick={() => setHasEnteredChat(true)} disabled={!username}>
          Join Chat
        </button>
      </div>
    );
  } else
    return (
      <div className="chat-content">
        <div className="message-list">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.user === username ? "outgoing" : "incoming"
              }`}
            >
              <strong>
                {msg.user === username ? `${msg.user}(me)` : msg.user}
              </strong>
              : {msg.text} <br />
              <small>{msg.timestamp}</small>
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>

        <div className="input-container">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyUp={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
          />{" "}
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    );
}
