import { useState } from "react";

export default function Characters() {
  const [connected] = useState(false);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Characters
      </h1>

      {!connected ? (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="text-lg mb-2" style={{ color: "var(--text-primary)" }}>
            Connect your GGG Account
          </div>
          <div className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Link your Path of Exile account to view your characters, gear, and progression.
            Supports both PoE1 and PoE2.
          </div>
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--accent)" }}
            onClick={() => {
              // TODO: Implement GGG OAuth flow
              console.log("OAuth flow not yet implemented");
            }}
          >
            Connect with GGG
          </button>
        </div>
      ) : (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Character list will appear here after OAuth connection.
        </div>
      )}
    </div>
  );
}
