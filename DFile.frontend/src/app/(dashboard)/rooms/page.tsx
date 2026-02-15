"use client";

import { useState } from "react";
import { RoomListView } from "@/components/room-list-view";
import { RoomModal } from "@/components/modals/create-room-modal";
import { ManageRoomCategoriesModal } from "@/components/modals/manage-room-categories-modal";
import { useData } from "@/contexts/data-context";
import { Room } from "@/types/asset";

export default function RoomsPage() {
    const {
        rooms,
        roomCategories,
        addRoom,
        updateRoom,
        archiveRoom,
        addRoomCategory,
        updateRoomCategory,
        archiveRoomCategory
    } = useData();

    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    const handleRoomClick = (room: Room) => {
        setSelectedRoom(room);
        setIsRoomModalOpen(true);
    };

    const handleSaveRoom = (room: Room) => {
        if (selectedRoom) {
            updateRoom(room);
        } else {
            addRoom(room);
        }
        setIsRoomModalOpen(false);
        setSelectedRoom(null);
    };

    return (
        <>
            <RoomListView
                rooms={rooms}
                roomCategories={roomCategories}
                onCreateRoom={() => {
                    setSelectedRoom(null);
                    setIsRoomModalOpen(true);
                }}
                onManageCategories={() => setIsCategoryModalOpen(true)}
                onRoomClick={handleRoomClick}
                onArchiveRoom={archiveRoom}
            />

            <RoomModal
                open={isRoomModalOpen}
                onOpenChange={(open) => {
                    setIsRoomModalOpen(open);
                    if (!open) setSelectedRoom(null);
                }}
                roomCategories={roomCategories}
                onSave={handleSaveRoom}
                initialData={selectedRoom}
            />

            <ManageRoomCategoriesModal
                open={isCategoryModalOpen}
                onOpenChange={setIsCategoryModalOpen}
                roomCategories={roomCategories}
                onAddCategory={addRoomCategory}
                onUpdateCategory={updateRoomCategory}
                onArchiveCategory={archiveRoomCategory}
            />
        </>
    );
}
