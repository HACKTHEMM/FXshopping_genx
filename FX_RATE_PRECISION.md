# FX Rate Precision - 3 Decimal Places (Truncated)

## Change Summary

All exchange rates are now **truncated** to 3 decimal places for both display and calculation.

### Truncation (NOT Rounding)

**Truncate** means cutting off at 3 decimals, not rounding:
- ✅ `0.0119` → `0.011` (truncate)
- ❌ `0.0119` → `0.012` (round - NOT used)

## Implementation

### Helper Function
```typescript
private truncateRate(rate: number): number {
  return Math.floor(rate * 1000) / 1000;
}
```

### Applied In:
1. **`convert()`** - Converts amount using truncated rate
2. **`getRate()`** - Returns truncated rate
3. **`getBatchRates()`** - Returns truncated rates for multiple currencies

## Examples

### Before:
```typescript
INR → USD rate from API: 0.011976...
Calculation: 1000 INR × 0.011976 = 11.976 USD
```

### After:
```typescript
INR → USD rate from API: 0.011976...
Truncated rate: 0.011
Calculation: 1000 INR × 0.011 = 11.00 USD
```

## Impact

### Routes API (`/api/quotes`)
- Uses `fxRateService.convert()`
- ✅ Now returns truncated rates

### Anchor Simulation (`lib/anchor-simulation.ts`)
- Uses `fxRateService.getRate()`
- ✅ Now uses truncated rates for deposit/withdrawal

### Display
- All rate displays will show max 3 decimal places
- Calculations match displayed rates exactly

## Testing

To verify truncation:
```typescript
// Test INR → USD
const rate = await fxRateService.getRate('INR', 'USD');
console.log(rate); // Should be 0.011 (not 0.0119 or 0.012)

// Test conversion
const result = await fxRateService.convert('INR', 'USD', 1000);
console.log(result.rate);    // 0.011
console.log(result.result);  // 11.00
```

## Why Truncate?

1. **Consistency**: What you see is what you calculate with
2. **Simplicity**: 3 decimal places is standard for most FX displays
3. **Conservative**: Truncating (not rounding up) ensures users never expect more than they'll get

---

**Modified File:** `lib/fx-rates.ts`
**Lines Added:**
- Line 33-39: `truncateRate()` helper
- Line 184: Truncate in `convert()`
- Line 215: Truncate in `getRate()`
- Line 232: Truncate in `getBatchRates()`
