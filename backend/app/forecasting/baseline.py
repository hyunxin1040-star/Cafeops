from __future__ import annotations
from dataclasses import dataclass
from statistics import mean
from typing import Iterable

@dataclass(frozen=True)
class ForecastPoint:
    hour: int
    baseline_orders: float
    weather_adjustment: float
    forecast_orders: int
    confidence: str


def forecast_by_hour(history: dict[int, Iterable[int]], *, rain_probability: float = 0.0, temperature_c: float | None = None) -> list[ForecastPoint]:
    """Simple, explainable MVP forecast.

    Uses the mean of historical same-hour demand and applies bounded weather adjustments.
    Rain effect intentionally remains modest to avoid fabricated precision.
    """
    result: list[ForecastPoint] = []
    for hour in sorted(history):
        values = list(history[hour])
        if not values:
            continue
        base = mean(values)
        rain_adj = -0.12 * max(0.0, min(1.0, rain_probability))
        temp_adj = 0.0
        if temperature_c is not None:
            if temperature_c >= 27:
                temp_adj = 0.04
            elif temperature_c <= 5:
                temp_adj = -0.03
        total_adj = max(-0.20, min(0.12, rain_adj + temp_adj))
        forecast = max(0, round(base * (1 + total_adj)))
        confidence = 'high' if len(values) >= 6 else 'medium' if len(values) >= 3 else 'low'
        result.append(ForecastPoint(hour, base, total_adj, forecast, confidence))
    return result
