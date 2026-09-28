# Data schema

프런트·백엔드가 공유해야 하는 핵심 계약.

- Store: id, name, address, lat/lng, openHours, storeType
- Order: id, storeId, orderedAt, items, grossAmount, discountAmount, status
- MenuItem: id, name, price, category
- RecipeItem(BOM): menuItemId, ingredientId, quantity, unit
- Ingredient: id, currentQty, unitCost, minOrderQty, shelfLifeDays
- Employee: id, hourlyWage, availability, maxWeeklyHours
- Recommendation: type, severity, evidence, scenarios, riskTier, approvalStatus

MVP는 `frontend/src/data/demo.js`와 backend dataclass field를 기준으로 한다.
