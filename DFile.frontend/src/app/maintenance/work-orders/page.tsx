import { redirect } from "next/navigation";

/** Work orders / tickets are consolidated under Schedules per product requirements. */
export default function WorkOrdersRedirectPage() {
    redirect("/maintenance/schedules");
}
