import { NextResponse } from "next/server";
import { NIFTY_50, fetchFundamentals, scoreStock } from "@/lib/buffettScorer";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const batchSize = 5;
        const results: any[] = [];

        for (let i = 0; i < NIFTY_50.length; i += batchSize) {
          const batch = NIFTY_50.slice(i, i + batchSize);

          send({
            type: "batch_start",
            batch: batch,
            progress: Math.round((i / NIFTY_50.length) * 100),
            message: `Fetching ${batch.join(", ")}...`,
          });

          const batchResults = await Promise.allSettled(
            batch.map((symbol) => fetchFundamentals(symbol)),
          );

          for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            if (result.status === "fulfilled" && result.value) {
              const scored = scoreStock(result.value);
              if (scored) {
                results.push(scored);
                send({
                  type: "stock_scored",
                  symbol: scored.symbol,
                  score: scored.score,
                  grade: scored.grade,
                  progress: Math.round(
                    (results.length / NIFTY_50.length) * 100,
                  ),
                });
              }
            }
          }

          // Delay between batches (except for the last one)
          if (i + batchSize < NIFTY_50.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }

        results.sort((a, b) => b.score - a.score);
        send({ type: "complete", total: results.length, progress: 100 });
      } catch (err: any) {
        send({ type: "error", message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Made with Bob
