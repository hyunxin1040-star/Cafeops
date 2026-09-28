from __future__ import annotations
from dataclasses import dataclass
from math import ceil

@dataclass(frozen=True)
class InventoryScenario:
    label: str
    order_qty: float
    stockout_risk: int
    waste_risk: int
    cost: int
    recommended: bool = False


def _round_to_step(value: float, step: float) -> float:
    return ceil(max(0.0, value) / step) * step


def build_inventory_scenarios(*, current_qty: float, expected_use: float, unit_cost: int, min_order_qty: float = 1.0, safety_stock: float = 0.8) -> list[InventoryScenario]:
    gap = max(0.0, expected_use + safety_stock - current_qty)
    recommended = _round_to_step(gap, min_order_qty)
    low = max(0.0, recommended - 2 * min_order_qty)
    high = recommended + 2 * min_order_qty

    def risk(qty: float) -> tuple[int, int]:
        ending = current_qty + qty - expected_use
        stockout = 2 if ending >= safety_stock else min(60, max(3, round((safety_stock - ending + .1) * 14)))
        waste = min(60, max(2, round(max(0.0, ending - safety_stock) * 5)))
        return stockout, waste

    raw = [('보수적', low), ('권장', recommended), ('공격적', high)]
    out = []
    for label, qty in raw:
        so, wa = risk(qty)
        out.append(InventoryScenario(label, qty, so, wa, round(qty * unit_cost), label == '권장'))
    return out
