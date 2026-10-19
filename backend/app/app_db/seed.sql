-- Mock Constella AI campaign proposals for the dev store, until the real integration writes them.
-- Inserted only while the store has no campaigns, so re-running init keeps status changes.
-- Products use Harbor Street's SKUs and names; created_at is spread over the last two weeks.

insert into app.campaigns
  (tenant_key, title, products, slogan, discount_pct, discount_code, target_segment, status, created_at)
select 'harbor-street', title, products::jsonb, slogan, discount_pct, discount_code, target_segment,
       status, now() - make_interval(days => days_ago)
from (values
  ('Morning coffee bundle',
   '[{"sku": "HS-COFFEE", "name": "Ground Coffee"}, {"sku": "HS-FILTERS", "name": "Coffee Filters"}]',
   'Your morning, sorted.', 15, 'MORNING15', 'Morning regulars', 'proposed', 0),
  ('Oat milk latte kit',
   '[{"sku": "HS-COFFEE", "name": "Ground Coffee"}, {"sku": "HS-OAT", "name": "Oat Milk"}]',
   'Café lattes, made at home.', 10, 'OATLATTE10', 'Coffee lovers', 'proposed', 1),
  ('Weekend breakfast',
   '[{"sku": "HS-BREAD", "name": "Sourdough Bread"}, {"sku": "HS-EGGS", "name": "Eggs (12)"}, {"sku": "HS-MILK", "name": "Whole Milk"}]',
   'Slow Saturday, sorted by Friday.', 12, 'BRUNCH12', 'Young families', 'proposed', 3),
  ('Pasta night',
   '[{"sku": "HS-PASTA", "name": "Spaghetti"}, {"sku": "HS-SAUCE", "name": "Tomato Sauce"}, {"sku": "HS-PARMESAN", "name": "Parmesan"}]',
   'Dinner in twenty minutes.', 20, 'PASTA20', 'Busy weeknight cooks', 'active', 5),
  ('Game day kit',
   '[{"sku": "HS-CHIPS", "name": "Tortilla Chips"}, {"sku": "HS-SALSA", "name": "Salsa"}, {"sku": "HS-GUAC", "name": "Guacamole"}]',
   'Kick-off snacks, one basket.', 15, 'GAMEDAY15', 'Weekend hosts', 'active', 7),
  ('Chips and salsa',
   '[{"sku": "HS-CHIPS", "name": "Tortilla Chips"}, {"sku": "HS-SALSA", "name": "Salsa"}]',
   'The classic pair, for less.', 10, 'DIP10', 'Snack shoppers', 'closed', 10),
  ('Breakfast basics',
   '[{"sku": "HS-MILK", "name": "Whole Milk"}, {"sku": "HS-EGGS", "name": "Eggs (12)"}]',
   'Stock up before the week starts.', 8, 'BASICS8', 'Weekly stock-up shoppers', 'closed', 13)
) as seed (title, products, slogan, discount_pct, discount_code, target_segment, status, days_ago)
where not exists (select 1 from app.campaigns where tenant_key = 'harbor-street');
