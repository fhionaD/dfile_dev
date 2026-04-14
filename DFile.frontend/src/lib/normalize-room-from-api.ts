import type { Room } from "@/types/asset";

function asTrimmedString(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return "";
}

/**
 * Maps /api/rooms rows (camelCase or PascalCase) into the frontend {@link Room} shape.
 * Ensures `unitId` is populated from `roomCode` when the client historically expected `unitId`.
 */
export function mapRoomFromApi(raw: Record<string, unknown>): Room {
    const id = asTrimmedString(raw.id ?? raw.Id);
    const unitId = asTrimmedString(raw.unitId ?? raw.UnitId ?? raw.roomCode ?? raw.RoomCode);
    const name = asTrimmedString(raw.name ?? raw.Name);
    const floor = asTrimmedString(raw.floor ?? raw.Floor);
    const categoryId = asTrimmedString(raw.categoryId ?? raw.CategoryId);
    const maxRaw = raw.maxOccupancy ?? raw.MaxOccupancy;
    const maxOccupancy =
        typeof maxRaw === "number" && Number.isFinite(maxRaw) && maxRaw >= 0 ? maxRaw : 0;
    const statusRaw = asTrimmedString(raw.status ?? raw.Status).toLowerCase();
    const status: Room["status"] =
        statusRaw === "occupied"
            ? "Occupied"
            : statusRaw === "maintenance"
              ? "Maintenance"
              : statusRaw === "deactivated"
                ? "Deactivated"
                : "Available";

    const allocRaw = raw.activeAllocationCount ?? raw.ActiveAllocationCount;
    const activeAllocationCount =
        typeof allocRaw === "number" && Number.isFinite(allocRaw) && allocRaw >= 0 ? Math.floor(allocRaw) : 0;

    return {
        id: id || unitId || "unknown-room",
        unitId: unitId || "—",
        name: name || "—",
        categoryId: categoryId || "",
        categoryName: asTrimmedString(raw.categoryName ?? raw.CategoryName) || undefined,
        subCategoryId: asTrimmedString(raw.subCategoryId ?? raw.SubCategoryId) || undefined,
        subCategoryName: asTrimmedString(raw.subCategoryName ?? raw.SubCategoryName) || undefined,
        floor: floor || "—",
        maxOccupancy,
        status,
        archived: Boolean(raw.archived ?? raw.Archived),
        isArchived: Boolean(raw.isArchived ?? raw.IsArchived),
        activeAllocationCount,
    };
}
