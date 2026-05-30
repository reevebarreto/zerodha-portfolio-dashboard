"use client";
import { useEffect, useState } from "react";

interface ProgressEvent {
  type: string;
  symbol?: string;
  score?: number;
  grade?: string;
  progress?: number;
  message?: string;
  batch?: string[];
}

export function BuffettLoadingFeed({ onComplete }: { onComplete: () => void }) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState<string>("");

  useEffect(() => {
    const es = new EventSource("/api/buffett/progress");

    es.onmessage = (e) => {
      const data: ProgressEvent = JSON.parse(e.data);

      if (data.type === "batch_start" && data.message) {
        setCurrentBatch(data.message);
      }

      if (data.type === "stock_scored") {
        setEvents((prev) => [data, ...prev].slice(0, 8)); // keep last 8
        setProgress(data.progress ?? 0);
      }

      if (data.type === "complete") {
        setProgress(100);
        es.close();
        setTimeout(onComplete, 600); // brief pause then show results
      }

      if (data.type === "error") {
        es.close();
      }
    };

    return () => es.close();
  }, [onComplete]);

  const gradeColor: Record<string, string> = {
    A: "#27500A",
    B: "#0C447C",
    C: "#633806",
    D: "#791F1F",
  };
  const gradeBg: Record<string, string> = {
    A: "#EAF3DE",
    B: "#E6F1FB",
    C: "#FAEEDA",
    D: "#FCEBEB",
  };

  return (
    <div style={{ padding: "48px 0", maxWidth: 480, margin: "0 auto" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Scoring Nifty 50 against Buffett criteria
          </span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{progress}%</span>
        </div>
        <div
          style={{
            height: 4,
            background: "var(--color-background-tertiary)",
            borderRadius: 2,
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#378ADD",
              borderRadius: 2,
              width: `${progress}%`,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        {currentBatch && (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginTop: 6,
            }}
          >
            {currentBatch}
          </p>
        )}
      </div>

      {/* Live feed */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {events.map((ev, i) => (
          <div
            key={`${ev.symbol}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 10px",
              background: "var(--color-background-secondary)",
              borderRadius: 6,
              opacity: i === 0 ? 1 : 0.5 + 0.5 * (1 - i / events.length),
              transition: "opacity 0.3s",
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 500, minWidth: 100 }}>{ev.symbol}</span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 7px",
                borderRadius: 10,
                background: gradeBg[ev.grade ?? "D"],
                color: gradeColor[ev.grade ?? "D"],
                fontWeight: 500,
              }}
            >
              {ev.grade}
            </span>
            <span style={{ color: "var(--color-text-secondary)" }}>
              Score: {ev.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Made with Bob
