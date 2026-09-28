import unittest
from backend.app.forecasting.baseline import forecast_by_hour
from backend.app.optimization.inventory import build_inventory_scenarios
from backend.app.optimization.staffing import staffing_by_slot
from backend.app.agent.orchestrator import plan_tools, validate_numeric_result

class EngineTests(unittest.TestCase):
    def test_forecast_rain_reduces_demand(self):
        hist = {14: [100, 110, 90, 100]}
        dry = forecast_by_hour(hist, rain_probability=0)[0]
        rain = forecast_by_hour(hist, rain_probability=0.8)[0]
        self.assertLess(rain.forecast_orders, dry.forecast_orders)

    def test_inventory_recommended_between_scenarios(self):
        xs = build_inventory_scenarios(current_qty=6.2, expected_use=12.4, unit_cost=7200, min_order_qty=2)
        self.assertEqual(len(xs), 3)
        self.assertTrue(xs[1].recommended)
        self.assertLessEqual(xs[0].order_qty, xs[1].order_qty)
        self.assertGreaterEqual(xs[2].order_qty, xs[1].order_qty)

    def test_staffing_peak(self):
        xs = staffing_by_slot([('14-17', 198, 2)], orders_per_staff_hour=22, slot_hours=3)
        self.assertEqual(xs[0].recommended_staff, 3)

    def test_agent_plan(self):
        p = plan_tools('이번 토요일 비 온다는데 운영 어떻게 해야 해?')
        self.assertIn('get_weather', p.tools)
        self.assertIn('optimize_inventory', p.tools)

    def test_validator(self):
        self.assertTrue(validate_numeric_result({'stockout_risk': 120, 'cost': -1}))
        self.assertFalse(validate_numeric_result({'stockout_risk': 5, 'waste_risk': 7, 'cost': 57600}))

if __name__ == '__main__':
    unittest.main()
