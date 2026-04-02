import type { Asset } from "@/types/asset";

/** UUID v4-style strings are not treated as human tag numbers. */
function looksLikeUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());
}

function normalizeFieldKey(k: string): string {
    return k.toLowerCase().replace(/_/g, "");
}

/** Build case-insensitive map: normalizedKey -> value (first wins on collision). */
function fieldMap(obj: Record<string, unknown>): Map<string, unknown> {
    const m = new Map<string, unknown>();
    for (const [k, v] of Object.entries(obj)) {
        const nk = normalizeFieldKey(k);
        if (!m.has(nk)) m.set(nk, v);
    }
    return m;
}

/**
 * Read string fields regardless of JSON casing (tagNumber, TagNumber, TAG_NUMBER).
 */
function pickStringField(obj: Record<string, unknown>, logicalNames: readonly string[]): string | undefined {
    const m = fieldMap(obj);
    for (const name of logicalNames) {
        const v = m.get(normalizeFieldKey(name));
        if (v === null || v === undefined) continue;
        if (typeof v === "string") {
            const t = v.trim();
            if (t.length) return t;
        }
        if (typeof v === "number" && Number.isFinite(v)) {
            return String(v);
        }
    }
    return undefined;
}

function pickPurchaseDateRaw(obj: Record<string, unknown>): unknown {
    const m = fieldMap(obj);
    const candidates = ["purchaseDate", "PurchaseDate", "purchase_date", "purchasedate"];
    for (const c of candidates) {
        const v = m.get(normalizeFieldKey(c));
        if (v !== null && v !== undefined) return v;
    }
    return undefined;
}

/** Normalize any API date scalar to a string we can format (ISO-like). */
export function coercePurchaseDateToString(raw: unknown): string | undefined {
    if (raw == null) return undefined;
    if (typeof raw === "string") {
        const t = raw.trim();
        return t.length ? t : undefined;
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return raw.toISOString();
    }
    return undefined;
}

function normalizeTagNumberFromApi(
    obj: Record<string, unknown>,
    id: string | undefined,
): string | undefined {
    let tag = pickStringField(obj, ["tagNumber", "TagNumber", "tag_number"]);
    if (!tag) return undefined;
    if (looksLikeUuid(tag)) return undefined;
    if (id && tag === id.trim()) return undefined;
    return tag;
}

function normalizeAssetCodeFromApi(obj: Record<string, unknown>): string | undefined {
    return pickStringField(obj, ["assetCode", "AssetCode", "asset_code"]);
}

/**
 * Maps any /api/assets row shape into a consistent Asset.
 * Resolves fields case-insensitively so TagNumber / purchaseDate survive any JSON casing.
 */
export function mapAssetFromApi(a: Record<string, unknown>): Asset {
    const base = { ...(a as unknown as Asset) };
    const id = pickStringField(a, ["id", "Id"]) ?? (typeof base.id === "string" ? base.id : "") ?? "";

    const purchaseRaw = pickPurchaseDateRaw(a) ?? base.purchaseDate;
    const purchaseDate =
        coercePurchaseDateToString(purchaseRaw) ?? coercePurchaseDateToString(base.purchaseDate as unknown);

    const tagNumber = normalizeTagNumberFromApi(a, id);

    let assetCode =
        normalizeAssetCodeFromApi(a) ??
        normalizeAssetCodeFromApi(base as unknown as Record<string, unknown>) ??
        (typeof base.assetCode === "string" && base.assetCode.trim() ? base.assetCode.trim() : undefined);
    if (assetCode && looksLikeUuid(assetCode)) assetCode = undefined;

    let allocationState =
        pickStringField(a, ["allocationState", "AllocationState"]) ??
        (typeof base.allocationState === "string" ? base.allocationState : undefined);
    const roomIdFromApi = pickStringField(a, ["roomId", "RoomId"]);
    if (!allocationState && roomIdFromApi)
        allocationState = "Allocated";

    return {
        ...base,
        id,
        tagNumber,
        assetCode,
        purchaseDate,
        allocationState,
        desc:
            pickStringField(a, ["assetName", "AssetName", "desc", "Desc"]) ??
            (typeof base.desc === "string" ? base.desc : undefined) ??
            "—",
        value:
            typeof a.purchasePrice === "number"
                ? a.purchasePrice
                : typeof a.PurchasePrice === "number"
                  ? a.PurchasePrice
                  : typeof a.value === "number"
                    ? a.value
                    : base.value ?? 0,
        room:
            pickStringField(a, ["roomName", "RoomName", "room", "Room"]) ??
            (typeof base.room === "string" ? base.room : undefined) ??
            "—",
    };
}

/** mm/dd/yyyy */
export function formatPurchaseDateDisplay(value: unknown): string {
    const s = coercePurchaseDateToString(value);
    if (!s) return "—";
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (ymd) {
        return `${ymd[2]}/${ymd[3]}/${ymd[1]}`;
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(value).trim() || "—";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
}

