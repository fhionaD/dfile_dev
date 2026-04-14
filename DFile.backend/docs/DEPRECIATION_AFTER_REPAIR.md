# Depreciation treatment after a repair (research note)

## Summary

Routine **repairs and maintenance** are generally **expensed as incurred**. They do **not** automatically require a new depreciation rate or useful-life assumption for the underlying fixed asset unless the expenditure **meets capitalization criteria** (e.g. enhances future economic benefits beyond restoring the original level of service and is measured reliably).

This aligns with common **IAS 16 / PP&E** practice: subsequent spend is either **capitalized** (when it is a betterment / replacement of a component that meets recognition criteria) or **expensed** (typical repairs). **Depreciation parameters** (method, rate, useful life) are revised only when there is an **accounting change in the asset’s service potential or pattern of consumption**—not merely because a repair occurred.

## What this means for DFile

- **No automatic change** to depreciation percentage, useful life, or depreciation method should be triggered solely by completing a maintenance “repair” ticket in this system.
- If the product later supports **capitalized major overhaul** as a distinct business event, that flow would need explicit rules (amount capitalized, componentization, revised residual life, etc.) and should be implemented as a **separate, explicit** feature—not inferred from a generic repair completion.

## System behavior

The maintenance **repair completion** path records **operational repair history** (via `AssetConditionLogs` linked to the maintenance record) and updates the asset’s **condition** for tracking. It does **not** write depreciation schedules or alter depreciation configuration.

## References (external)

- IFRS Foundation, **IAS 16** *Property, Plant and Equipment* — subsequent expenditure recognition and depreciation of recognized PP&E: https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/
