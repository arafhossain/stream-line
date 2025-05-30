export interface IMessageData {
  userId: string;
  username: string;
  type: "stop_typing" | "message" | "typing" | "join";
  email?: string;
  text?: string;
  timestamp?: string;
  roomId: string;
}
