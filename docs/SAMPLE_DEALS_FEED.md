# Sample Deals Feed

The concierge AI service reads rotating “happy-hour” style deals from `ai-agent/data/deals_feed.csv`. Each row represents a potential deal found in the Kaggle-based datasets and includes metatada for flights, stays, or cars. A background worker (`deal_feed_refresh_task`) runs every hour (configurable via `DEAL_REFRESH_SECONDS`) and:

1. Loads the CSV.
2. Detects rows that qualify as deals based on price drop/availability/promo rules.
3. Randomly selects a limited number of deals per type (defaults: 6 flights, 6 stays, 6 cars).
4. Stamps a new `promo_end` one hour in the future, persists the rows in Supabase Postgres, and refreshes the Redis/in-memory cache + WebSocket watchers.

## CSV Columns

| Column | Description |
| --- | --- |
| `deal_id` | Unique identifier; reused across rotations. |
| `deal_type` | `flight`, `hotel`, or `car`. |
| `origin` / `destination` / `city` | Location info (cars primarily use `city`). |
| `listing_id` | Identifier for hotels. |
| `price`, `avg_30d_price`, `currency` | Pricing inputs for deal detection. |
| `availability`, `is_limited` | Remaining inventory. |
| `tags` | Pre-computed metadata (pipe-delimited). |
| `airline`, `stops`, `duration_hours` | Flight specifics. |
| `neighborhood`, `amenities`, `pet_friendly`, `breakfast_included`, `near_transit`, `parking` | Hotel specifics. |
| `car_vendor`, `car_type`, `transmission`, `fuel`, `limited_mileage`, `pickup_location` | Car rental metadata. |
| `cancellation_policy`, `refund_deadline`, `refundable` | Policy snippets surfaced via `/policy`. |
| `price_history` | Historical prices (pipe-delimited) for scoring. |

The worker refresh count per type can be overridden with:

```bash
export DEAL_REFRESH_SECONDS=1800       # rotate every 30 minutes
export DEALS_PER_FLIGHT=8
export DEALS_PER_HOTEL=8
export DEALS_PER_CAR=5
```

Whenever a new rotation runs, WebSocket watches are evaluated against the newly active deals (e.g., price drops or scarce inventory) to push alerts back to the frontend.
