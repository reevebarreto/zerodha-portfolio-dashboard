# Buffett Scoring Engine Documentation

## Overview

The Buffett Scoring Engine is a sophisticated investment analysis tool that evaluates Nifty 50 stocks against Warren Buffett's core investment principles. It provides personalized portfolio allocation recommendations based on fundamental analysis.

## Features

### 1. **Automated Fundamental Analysis**

- Fetches real-time fundamental data from Yahoo Finance for all Nifty 50 stocks
- Analyzes 6 key metrics that align with Buffett's investment philosophy
- Caches results for 24 hours to optimize performance and respect API rate limits

### 2. **Scoring System (100 points total)**

| Criterion                  | Max Points | What It Measures                                                  | Scoring Rules                                               |
| -------------------------- | ---------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| **ROE** (Return on Equity) | 20         | How efficiently the company earns profit from shareholders' money | >20% = 20pts, 15-20% = 15pts, 10-15% = 10pts, <10% = 5pts   |
| **Debt/Equity Ratio**      | 20         | How much the company borrows vs what it owns                      | <0.3 = 20pts, 0.3-0.5 = 15pts, 0.5-1.0 = 10pts, >1.0 = 5pts |
| **Net Profit Margin**      | 20         | How much profit is kept from every rupee of revenue               | >20% = 20pts, 10-20% = 15pts, 5-10% = 10pts, <5% = 5pts     |
| **P/E Ratio**              | 20         | How expensive the stock is relative to earnings                   | <15 = 20pts, 15-25 = 15pts, 25-40 = 10pts, >40 = 5pts       |
| **Free Cash Flow**         | 10         | Whether the company generates real cash (not just paper profit)   | Positive = 10pts, Negative = 0pts                           |
| **Dividend Yield**         | 10         | Whether it rewards shareholders consistently                      | >1% = 10pts, 0.5-1% = 7pts, >0% = 5pts, none = 0pts         |

### 3. **Grade System**

- **Grade A** (75-100 points): Strong fundamentals, Buffett would approve
- **Grade B** (60-74 points): Decent fundamentals, hold-worthy
- **Grade C** (45-59 points): Weak fundamentals, review recommended
- **Grade D** (<45 points): Does not meet criteria, consider reducing

### 4. **Smart Allocation Model**

The engine calculates optimal portfolio allocation based on:

- **Score-weighted distribution**: Higher-scoring stocks get larger allocations
- **Diversification cap**: No single stock exceeds 15% of portfolio
- **Configurable parameters**:
  - Budget: ₹10,000 to ₹10,00,000+
  - Top N stocks: 5 to 20 (default: 12)

### 5. **Visual Progress Tracking**

- **Progress bars** show how much you've invested vs. recommended target
- **Color coding**:
  - 🟢 Green (100%+): Fully allocated
  - 🔵 Teal (50-99%): Half way there
  - 🔵 Blue (<50%): Just starting
- **Criteria breakdown**: Mini visual indicators for each of the 6 scoring factors

### 6. **My Holdings Analysis**

- Cross-references your current Zerodha holdings with Buffett scores
- Provides actionable verdicts:
  - "Strong hold — Buffett would approve" (Grade A)
  - "Hold — decent fundamentals" (Grade B)
  - "Review — fundamentals are weak" (Grade C)
  - "Consider reducing — does not meet criteria" (Grade D)

## Technical Architecture

### Backend Components

#### 1. **Scoring Engine** (`lib/buffettScorer.ts`)

```typescript
// Core functions
scoreAllNifty50(); // Scores all 50 stocks
fetchFundamentals(symbol); // Gets data from Yahoo Finance
scoreStock(fundamentals); // Applies scoring rubric
calculateAllocation(); // Computes optimal weights
```

#### 2. **API Routes** (`app/api/buffett/`)

- **GET `/api/buffett/scores`**: Returns scored stocks with allocation model
  - Query params: `budget` (default: 100000), `topN` (default: 12)
  - Returns 202 status while calculating, 200 when ready
- **GET `/api/buffett/my-holdings`**: Your holdings with Buffett analysis
  - Enriches Kite holdings data with scores and verdicts
- **POST `/api/buffett/refresh`**: Manually trigger cache refresh
  - Clears cache and starts background scoring

#### 3. **Caching Strategy**

- **In-memory cache** using `node-cache` (24-hour TTL)
- **Batch fetching**: Processes 5 stocks at a time to avoid rate limits
- **300ms delay** between batches
- **Automatic daily refresh** at 6:30 AM IST (weekdays only)

#### 4. **Daily Cron Job** (`instrumentation.ts`)

```typescript
// Runs at 6:30 AM IST every weekday
cron.schedule("0 1 * * 1-5", async () => {
  clearCache();
  await scoreAllNifty50();
});
```

### Frontend Components

#### 1. **Buffett Dashboard Page** (`app/dashboard/buffett/page.tsx`)

- **Interactive controls**: Budget input and top-N slider
- **Real-time recalculation**: Uses `useMemo` for client-side allocation updates
- **Polling mechanism**: Checks every 5 seconds while scores are calculating
- **Responsive table**: Shows all allocation details with progress bars

#### 2. **Key UI Components**

- `AllocationRow`: Individual stock row with progress bar
- `CriteriaBreakdown`: 6-segment mini visualization
- `ProgressBar`: Invested vs. target with percentage
- `MyHoldingCard`: Holdings analysis with color-coded borders

## Data Flow

```
User opens /dashboard/buffett
         ↓
Frontend calls GET /api/buffett/scores?budget=100000&topN=12
         ↓
Backend checks node-cache (24hr TTL)
    Hit? → Return cached scores immediately
    Miss? → Fetch Yahoo Finance for all 50 stocks (batched, 5 at a time)
              → Score each stock using rubric
              → Sort by score desc
              → Cache result
              → Return to frontend
         ↓
Frontend simultaneously calls GET /api/buffett/my-holdings
    → Backend fetches current Kite holdings
    → Cross-references with score cache
    → Returns enriched holdings with verdicts
         ↓
Frontend merges both responses:
    For each stock in top N scores:
      investedAmount = match from Kite holdings (or 0)
      targetAmount   = from allocation model
      pct            = investedAmount / targetAmount * 100
    → Render progress bar rows
```

## Yahoo Finance Integration

### Endpoint

```
GET https://query2.finance.yahoo.com/v10/finance/quoteSummary/{SYMBOL}.NS
  ?modules=financialData,defaultKeyStatistics,summaryDetail
```

### Required Headers

```javascript
{
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json'
}
```

### Symbol Mapping

- Most NSE symbols: `SYMBOL.NS` (e.g., `TCS.NS`)
- Special cases:
  - `M&M` → `M%26M.NS` (URL-encoded ampersand)
  - `BAJAJ-AUTO` → `BAJAJ-AUTO.NS` (hyphen preserved)

### Field Extraction

```javascript
const fin  = result.financialData;
const keys = result.defaultKeyStatistics;
const sum  = result.summaryDetail;

{
  roe: keys.returnOnEquity?.raw,
  debtToEquity: fin.debtToEquity?.raw / 100,  // Convert from percentage
  profitMargin: fin.profitMargins?.raw,
  freeCashFlow: fin.freeCashflow?.raw,
  trailingPE: sum.trailingPE?.raw,
  dividendYield: sum.dividendYield?.raw
}
```

## Usage Guide

### For Users

1. **Navigate to Buffett Score**
   - From dashboard, click "Analyze Nifty 50 Stocks" button
   - Or go directly to `/dashboard/buffett`

2. **Set Your Parameters**
   - Enter your investment budget (₹10,000 - ₹10,00,000+)
   - Choose how many stocks to invest in (5-20)
   - The allocation model updates instantly

3. **Review Recommendations**
   - Check the main table for all scored stocks
   - Look at progress bars to see where you're under/over-allocated
   - Review the criteria breakdown (6 colored squares) for each stock

4. **Analyze Your Holdings**
   - Scroll to "My Holdings Analysis" section
   - See which of your current holdings meet Buffett's criteria
   - Follow the verdicts for each holding

### For Developers

#### Adding New Scoring Criteria

1. Update the `scoreStock()` function in `lib/buffettScorer.ts`
2. Add the new field to the `Fundamentals` interface
3. Update the Yahoo Finance field mapping in `fetchFundamentals()`
4. Adjust the UI to display the new criterion

#### Changing the Stock Universe

Replace the `NIFTY_50` constant in `lib/buffettScorer.ts`:

```typescript
export const NIFTY_50 = [
  "RELIANCE",
  "TCS", // ... your stocks here
];
```

#### Customizing Allocation Rules

Modify `calculateAllocation()` parameters:

```typescript
calculateAllocation(
  scores,
  budget,
  (topN = 12), // Number of stocks
  (maxWeight = 0.15), // Max 15% per stock
);
```

## Performance Considerations

### First Load (Cold Cache)

- **Time**: ~45 seconds
- **Reason**: Fetching fundamentals for 50 stocks from Yahoo Finance
- **User Experience**: Shows loading state with progress message
- **Polling**: Frontend checks every 5 seconds until ready

### Subsequent Loads (Warm Cache)

- **Time**: <100ms
- **Reason**: Serving from in-memory cache
- **Cache Duration**: 24 hours
- **Refresh**: Automatic daily at 6:30 AM IST

### Rate Limiting

- **Batch size**: 5 stocks per batch
- **Delay**: 300ms between batches
- **Total batches**: 10 (for 50 stocks)
- **Total time**: ~3 seconds for API calls + processing

## Troubleshooting

### Issue: "Scores are being calculated..."

**Cause**: Cold cache, first-time load  
**Solution**: Wait 45 seconds, page will auto-refresh

### Issue: Scores seem outdated

**Cause**: Cache hasn't refreshed  
**Solution**: Call `POST /api/buffett/refresh` or wait for daily cron

### Issue: Some stocks show null values

**Cause**: Yahoo Finance doesn't have data for that metric  
**Solution**: Stock gets 0 points for that criterion (expected behavior)

### Issue: TypeError: Cannot read property 'raw' of undefined

**Cause**: Yahoo Finance response structure changed  
**Solution**: Check `fetchFundamentals()` field mappings

## Future Enhancements

### Planned Features

- [ ] Historical score tracking (see how scores change over time)
- [ ] Email alerts when high-scoring stocks become undervalued
- [ ] Sector-wise allocation recommendations
- [ ] Comparison with your actual portfolio allocation
- [ ] Export recommendations to CSV
- [ ] Integration with Zerodha's order placement API

### Potential Improvements

- [ ] Add more scoring criteria (ROCE, EPS growth, etc.)
- [ ] Support for other indices (Nifty Next 50, Bank Nifty)
- [ ] Machine learning to optimize scoring weights
- [ ] Backtesting: "What if I followed this strategy 5 years ago?"

## Dependencies

```json
{
  "axios": "^1.6.0", // HTTP client for Yahoo Finance
  "node-cache": "^5.1.2", // In-memory caching
  "node-cron": "^3.0.3", // Daily refresh scheduler
  "kiteconnect": "^4.0.0" // Zerodha Kite API
}
```

## License & Disclaimer

This tool is for educational and informational purposes only. It does not constitute financial advice. Always do your own research and consult with a qualified financial advisor before making investment decisions.

The scoring system is a simplified interpretation of Warren Buffett's investment philosophy and should not be considered a complete representation of his methodology.

---

**Built with ❤️ for value investors**
