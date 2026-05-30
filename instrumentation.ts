export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { scoreAllNifty50, clearCache } = await import("./lib/buffettScorer");

    // Run at 6:30am IST every weekday (1:00 UTC = 6:30 IST)
    cron.default.schedule("0 1 * * 1-5", async () => {
      console.log("[buffett] Daily score refresh starting...");
      clearCache();
      await scoreAllNifty50();
      console.log("[buffett] Daily score refresh complete.");
    });

    console.log(
      "[buffett] Cron job scheduled: Daily refresh at 6:30 AM IST (weekdays)",
    );
  }
}

// Made with Bob
