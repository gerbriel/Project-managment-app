# Database Migration Required

## ⚠️ Location Columns Missing

The labels are showing as "Loading..." because the database is missing location columns that were added in a recent update.

### To Fix This Issue:

**Option 1: Run SQL Migration in Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/add-location-columns.sql`
4. Click **Run** to execute the migration
5. Refresh your browser

**Option 2: Use the Migration Script**
```bash
# Run the location migration
node scripts/add-location-columns.cjs
```

### What This Migration Does:
- Adds `location_lat` (double precision) column to cards table
- Adds `location_lng` (double precision) column to cards table  
- Adds `location_address` (text) column to cards table
- Creates an index for efficient location queries
- Grants proper permissions for the columns

### After Migration:
- Labels will load properly
- Location features will work (map view, address storage)
- All existing functionality will be restored

### Migration SQL Preview:
```sql
-- Add location columns to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lng double precision;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_address text;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS cards_board_loc_idx ON public.cards(board_id, location_lat, location_lng);
```

**Note:** This migration is safe to run multiple times - it uses `IF NOT EXISTS` clauses.