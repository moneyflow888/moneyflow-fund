export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(214,178,94,0.25), transparent 60%)," +
          "radial-gradient(900px 500px at 90% 10%, rgba(46,91,255,0.25), transparent 55%)," +
          "#0B0B0C",
        color: "white",
        padding: 40,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>
            💰 MoneyFlow
          </h1>
          <p style={{ opacity: 0.7, marginTop: 6 }}>
            Fund Core Dashboard
          </p>
        </div>

        <div style={{ opacity: 0.5, fontSize: 14 }}>
          v0 · local dev
        </div>
      </header>

      {/* KPI Grid */}
      <section>
        <p style={{ opacity: 0.6, marginBottom: 16 }}>
          Fund NAV · PnL · Principal · Investor Ledger
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          <Kpi title="Total NAV" value="$0.00" />
          <Kpi title="This Week PnL" value="+$0.00" />
          <Kpi title="Net Principal" value="$0.00" />
        </div>
      </section>

      {/* Placeholder / Next */}
      <section
        style={{
          marginTop: 48,
          padding: 24,
          borderRadius: 16,
          border: "1px dashed rgba(255,255,255,0.15)",
          opacity: 0.6,
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 8 }}>
          Coming next
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Supabase fund snapshot</li>
          <li>Investor accounts</li>
          <li>Admin settlement</li>
        </ul>
      </section>
    </main>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 14 }}>{title}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginTop: 8,
          letterSpacing: 0.3,
        }}
      >
        {value}
      </div>
    </div>
  );
}
