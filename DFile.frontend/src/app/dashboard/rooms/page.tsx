"use client";

import { useState } from "react";
import { RoomListView } from "@/components/room-list-view";
import { RoomModal } from "@/components/modals/create-room-modal";
import { ManageRoomCategoriesModal } from "@/components/modals/manage-room-categories-modal";
import { useRooms, useRoomCategories, useAddRoom, useUpdateRoom, useArchiveRoom, useAddRoomCategory, useUpdateRoomCategory, useArchiveRoomCategory } from "@/hooks/use-rooms";
import { Room } from "@/types/asset";

export default function RoomsPage() {
    const { data: rooms = [] } = useRooms();
    const { data: roomCategories = [] } = useRoomCategories();

    const addRoomMutation = useAddRoom();
    const updateRoomMutation = useUpdateRoom();
    const archiveRoomMutation = useArchiveRoom();

    const addCategoryMutation = useAddRoomCategory();
    const updateCategoryMutation = useUpdateRoomCategory();
    const archiveCategoryMutation = useArchiveRoomCategory();

    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    const handleRoomClick = (room: Room) => {
        setSelectedRoom(room);
        setIsRoomModalOpen(true);
    };

    const handleSaveRoom = async (room: Room) => {
        if (selectedRoom) {
            await updateRoomMutation.mutateAsync(room);
        } else {
            await addRoomMutation.mutateAsync(room);
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
                onArchiveRoom={async (id) => await archiveRoomMutation.mutateAsync(id)}
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
                onAddCategory={async (category) => await addCategoryMutation.mutateAsync({ ...category, status: 'Active' })}
                onUpdateCategory={async (id, data) => await updateCategoryMutation.mutateAsync({ ...data, id } as any)}
                onArchiveCategory={async (id) => await archiveCategoryMutation.mutateAsync(id)}
            />
        </>
    );
}
