export interface IMessageData {
  user: string;
  type: "stop_typing" | "message" | "typing";
  text?: string;
  timestamp?: string;
}
