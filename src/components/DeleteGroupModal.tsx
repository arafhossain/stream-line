import React, { useState } from "react";
import "./DeleteGroupModal.css";
import { IUserData } from "../models/IUserData";
import { toast } from "react-toastify";
import {
  deleteRoom,
  removeRoomFromGroupParticipants,
} from "../services/roomService";

interface IDeleteGroupModalProps {
  groupName: string;
  roomId: string;
  roomParticipants: string[];
  closeModal: () => void;
  refreshRoomData: () => void;
  removeTempRoom: (roomId: string) => void;
}

const DeleteGroupModal: React.FC<IDeleteGroupModalProps> = ({
  groupName,
  closeModal,
  roomId,
  roomParticipants,
  refreshRoomData,
  removeTempRoom,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Are you sure you want to delete group '{groupName}'?</h2>

        <div className="modal-actions">
          <button onClick={() => closeModal()}>Cancel</button>
          <button
            onClick={async () => {
              try {
                await deleteRoom(roomId);
                await removeRoomFromGroupParticipants(roomParticipants, roomId);
                removeTempRoom(roomId);
                toast.success("Room deleted!", {
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
                toast.error("Failed to delete room. Try again later.", {
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteGroupModal;
