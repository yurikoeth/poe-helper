export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quick stats cards — will be populated with real data via GGG OAuth */}
        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            Characters
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            --
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Connect via GGG OAuth to view
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            Current League
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            --
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Will auto-detect active league
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            Sessions Today
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            --
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Synced from overlay
          </div>
        </div>
      </div>

      {/* Getting started section */}
      <div
        className="mt-6 rounded-lg border p-6"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          Getting Started
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>Download and install the ExiledOrb overlay from the releases page</li>
          <li>Connect your GGG account via OAuth to access character and stash data</li>
          <li>Launch PoE and the overlay will auto-detect your Client.txt</li>
          <li>Press Ctrl+C on any item in-game to see its price</li>
          <li>Press F5 to toggle the overlay visibility</li>
        </ol>
      </div>
    </div>
  );
}
