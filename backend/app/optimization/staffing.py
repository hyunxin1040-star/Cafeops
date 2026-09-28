from __future__ import annotations
from dataclasses import dataclass
from math import ceil

@dataclass(frozen=True)
class StaffingSlot:
    label: str
    forecast_orders: int
    current_staff: int
    recommended_staff: int


def staffing_by_slot(slots: list[tuple[str, int, int]], *, orders_per_staff_hour: float = 22.0, slot_hours: float = 3.0, minimum_staff: int = 1) -> list[StaffingSlot]:
    out = []
    capacity_per_staff = orders_per_staff_hour * slot_hours
    for label, orders, current in slots:
        need = max(minimum_staff, ceil(orders / capacity_per_staff))
        out.append(StaffingSlot(label, orders, current, need))
    return out
