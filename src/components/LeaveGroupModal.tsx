import React, { useState } from "react";
import "./LeaveGroupModal.css";
import { toast } from "react-toastify";
import {
  removeRoomFromUser,
  removeUserFromRoomArray,
} from "../services/roomService";
import { IUserData } from "../models/IUserData";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useAuth } from "../contexts/AuthContext";
import { IMessageData } from "../models/IMessageData";
import { saveMessageToFirestore } from "../services/messageService";

interface ILeaveGroupModalProps {
  groupName: string;
  roomId: string;
  closeModal: () => void;
  refreshRoomData: () => void;
  userData: IUserData | null;
  removeTempRoom: (roomId: string) => void;
}

const LeaveGroupModal: React.FC<ILeaveGroupModalProps> = ({
  groupName,
  closeModal,
  roomId,
  refreshRoomData,
  userData,
  removeTempRoom,
}) => {
  const { currentUser } = useAuth();
  const { sendMessage } = useWebSocket();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Are you sure you want to leave group '{groupName}'?</h2>

        <div className="modal-actions">
          <button onClick={() => closeModal()}>Cancel</button>
          <button
            onClick={async () => {
              try {
                if (userData?.userId) {
                  await removeUserFromRoomArray(roomId, userData?.userId);
                  await removeRoomFromUser(userData?.userId, roomId);
                  removeTempRoom(roomId);
                  const LEAVE_MESSAGE: IMessageData = {
                    userId: "system",
                    username: userData.username ?? "",
                    type: "message",
                    timestamp: new Date().toISOString(),
                    roomId,
                    text: `${userData.username} has left the chat.`,
                  };
                  sendMessage(LEAVE_MESSAGE);
                  saveMessageToFirestore(LEAVE_MESSAGE);
                }
                toast.success("You have left the room!", {
                  position: "bottom-right",
                  autoClose: 3000,
                  style: {
                    backgroundColor: "#2a2a3a",
                    color: "#00a9d1",
                    border: "1px solid #00a9d1",
                  },
                });
                refreshRoomData();
                closeModal();
              } catch (err) {
                toast.error("Failed to leave room. Try again later. :(", {
                  position: "bottom-right",
                  autoClose: 3000,
                  style: {
                    backgroundColor: "#2a2a3a",
                    color: "#ff4d4f",
                    border: "1px solid #ff4d4f",
                  },
                });
              }
            }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveGroupModal;
