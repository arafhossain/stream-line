export interface IMessageData {
  username: string;
  type: "stop_typing" | "message" | "typing";
  email?: string;
  text?: string;
  timestamp?: string;
  roomId?: string;
}
