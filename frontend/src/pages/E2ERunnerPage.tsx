import React, { useState, useRef, useCallback } from "react";

// ─── types ────────────────────────────────────────────────────────────────────
type Status = "idle" | "running" | "pass" | "fail" | "skip";

interface Step {
  id: string;
  phase: string;
  label: string;
  status: Status;
  detail?: string;
  ts?: string;
}

interface RunState {
  running: boolean;
  done: boolean;
  overallPass: boolean;
  steps: Step[];
  log: string[];
}

// ─── API helper ───────────────────────────────────────────────────────────────
const BASE = "http://localhost:8000/api/v1";

async function api(
  method: string,
  path: string,
  body?: object,
  token?: string
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ─── initial steps definition ─────────────────────────────────────────────────
function makeSteps(): Step[] {
  return [
    { id: "s1",  phase: "Phase 1 – Seller Onboarding",       label: "Seller Registration",            status: "idle" },
    { id: "s2",  phase: "Phase 1 – Seller Onboarding",       label: "Admin Login",                    status: "idle" },
    { id: "s3",  phase: "Phase 1 – Seller Onboarding",       label: "Admin Search for Seller",        status: "idle" },
    { id: "s4",  phase: "Phase 1 – Seller Onboarding",       label: "Admin Approve Seller",           status: "idle" },
    { id: "s5",  phase: "Phase 2 – Store & Product Setup",   label: "Seller Login",                   status: "idle" },
    { id: "s6",  phase: "Phase 2 – Store & Product Setup",   label: "Fetch Categories",               status: "idle" },
    { id: "s7",  phase: "Phase 2 – Store & Product Setup",   label: "Create Product",                 status: "idle" },
    { id: "s8",  phase: "Phase 2 – Store & Product Setup",   label: "Product Defaults to PENDING",    status: "idle" },
    { id: "s9",  phase: "Phase 2 – Store & Product Setup",   label: "Create Product Variant",         status: "idle" },
    { id: "s10", phase: "Phase 3 – Buyer & Admin Approval",  label: "Buyer Cannot See Pending Product", status: "idle" },
    { id: "s11", phase: "Phase 3 – Buyer & Admin Approval",  label: "Admin Approve Product",          status: "idle" },
    { id: "s12", phase: "Phase 3 – Buyer & Admin Approval",  label: "Buyer Can See Approved Product", status: "idle" },
  ];
}

// ─── component ────────────────────────────────────────────────────────────────
export default function E2ERunnerPage() {
  const [state, setState] = useState<RunState>({
    running: false,
    done: false,
    overallPass: false,
    steps: makeSteps(),
    log: [],
  });
  const logRef = useRef<HTMLDivElement>(null);

  // helper to update a single step
  const setStep = useCallback(
    (id: string, patch: Partial<Step>) => {
      setState((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));
    },
    []
  );

  const pushLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setState((prev) => ({ ...prev, log: [...prev.log, `[${ts}] ${msg}`] }));
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 50);
  }, []);

  // ─── test runner ────────────────────────────────────────────────────────────
  const runTests = useCallback(async () => {
    setState({ running: true, done: false, overallPass: false, steps: makeSteps(), log: [] });

    const ts = Date.now();
    const phone = `999${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}`;
    const email = `seller_${ts}@test.com`;
    const pass = "testpass123";
    const productName = `E2E Product ${ts}`;
    const productSlug = `e2e-product-${ts}`;

    let adminToken = "";
    let sellerToken = "";
    let sellerProfileId = 0;
    let productId = 0;
    let categoryId = 0;

    const pass_step = (id: string, detail?: string) => {
      setStep(id, { status: "pass", detail, ts: new Date().toLocaleTimeString() });
      pushLog(`✅ PASS – ${state.steps.find((s) => s.id === id)?.label ?? id}${detail ? ": " + detail : ""}`);
    };
    const fail_step = (id: string, detail: string) => {
      setStep(id, { status: "fail", detail, ts: new Date().toLocaleTimeString() });
      pushLog(`❌ FAIL – ${detail}`);
    };
    const run_step = (id: string) => {
      setStep(id, { status: "running" });
      pushLog(`⏳ Running – ${makeSteps().find((s) => s.id === id)?.label ?? id}...`);
    };
    const skip_step = (id: string) => {
      setStep(id, { status: "skip", ts: new Date().toLocaleTimeString() });
    };

    let failed = false;

    try {
      // ── Step 1: Register seller ───────────────────────────────────────────
      run_step("s1");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s1, data: d1 } = await api("POST", "/auth/register/seller/", {
        phone, email, password: pass,
        first_name: "Test", last_name: "Seller",
        business_name: `Test Business ${ts}`,
        gst_number: `22AAAAA0000A1Z5`,
        pan_number: "ABCDE1234F",
      });
      if (s1 === 201) {
        pass_step("s1", `Seller ID ${d1?.user?.id}`);
      } else {
        fail_step("s1", `Expected 201, got ${s1}: ${JSON.stringify(d1)}`);
        failed = true;
      }

      // ── Step 2: Admin login ───────────────────────────────────────────────
      run_step("s2");
      await new Promise((r) => setTimeout(r, 300));
      const { status: s2, data: d2 } = await api("POST", "/auth/login/", {
        phone: "9000000002", password: "Admin@12345",
      });
      if (s2 === 200) {
        adminToken = d2.access;
        pass_step("s2", "Admin token acquired");
      } else {
        fail_step("s2", `Expected 200, got ${s2}`);
        failed = true;
      }

      if (failed) throw new Error("Stopping after admin login failure");

      // ── Step 3: Admin search for seller ──────────────────────────────────
      run_step("s3");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s3, data: d3 } = await api("GET", `/admin/sellers/?search=${phone}`, undefined, adminToken);
      if (s3 === 200 && d3?.results?.length > 0) {
        sellerProfileId = d3.results[0].id;
        pass_step("s3", `Found seller profile ID ${sellerProfileId}`);
      } else {
        fail_step("s3", `Got ${s3}, results: ${JSON.stringify(d3?.results)}`);
        failed = true;
      }

      if (failed) throw new Error("Stopping – seller not found");

      // ── Step 4: Admin approve seller ──────────────────────────────────────
      run_step("s4");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s4 } = await api("POST", `/admin/sellers/${sellerProfileId}/approve/`, undefined, adminToken);
      if (s4 === 200) {
        pass_step("s4", `Seller profile ${sellerProfileId} approved`);
      } else {
        fail_step("s4", `Expected 200, got ${s4}`);
        failed = true;
      }

      // ── Step 5: Seller login ──────────────────────────────────────────────
      run_step("s5");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s5, data: d5 } = await api("POST", "/auth/login/", { phone, password: pass });
      if (s5 === 200) {
        sellerToken = d5.access;
        pass_step("s5", "Seller token acquired");
      } else {
        fail_step("s5", `Expected 200, got ${s5}`);
        failed = true;
      }

      if (failed) throw new Error("Stopping – seller login failed");

      // ── Step 6: Fetch categories ──────────────────────────────────────────
      run_step("s6");
      await new Promise((r) => setTimeout(r, 300));
      const { status: s6, data: d6 } = await api("GET", "/categories/", undefined, sellerToken);
      if (s6 === 200 && Array.isArray(d6) && d6.length > 0) {
        categoryId = d6[0].id;
        pass_step("s6", `Using category "${d6[0].name}"`);
      } else {
        fail_step("s6", `Got ${s6}, no categories`);
        failed = true;
      }

      if (failed) throw new Error("Stopping – no categories");

      // ── Step 7: Create product ────────────────────────────────────────────
      run_step("s7");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s7, data: d7 } = await api("POST", "/seller/products/", {
        name: productName, slug: productSlug,
        description: "E2E test product created via browser runner.",
        brand: "E2E Brand", category: categoryId,
        base_price: "999.00", compare_at_price: "1299.00",
        tax_percentage: "18.00", shipping_charge: "50.00",
        returnable: true, return_window_days: 7, status: "ACTIVE",
      }, sellerToken);
      if (s7 === 201) {
        productId = d7.id;
        pass_step("s7", `Product ID ${productId} – "${productName}"`);
      } else {
        fail_step("s7", `Expected 201, got ${s7}: ${JSON.stringify(d7)}`);
        failed = true;
      }

      // ── Step 8: Product is PENDING ────────────────────────────────────────
      if (!failed && d7?.approval_status === "PENDING") {
        pass_step("s8", `approval_status = ${d7.approval_status}`);
      } else if (!failed) {
        fail_step("s8", `Expected PENDING, got ${d7?.approval_status}`);
        failed = true;
      }

      if (failed) throw new Error("Stopping – product creation failed");

      // ── Step 9: Create variant ────────────────────────────────────────────
      run_step("s9");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s9 } = await api("POST", `/seller/products/${productId}/variants/`, {
        sku: `SKU-${ts}`, price: "999.00", is_active: true, attribute_summary: "Default",
      }, sellerToken);
      if (s9 === 201) {
        pass_step("s9", `Variant created for product ${productId}`);
      } else {
        fail_step("s9", `Expected 201, got ${s9}`);
        failed = true;
      }

      // ── Step 10: Buyer cannot see pending ─────────────────────────────────
      run_step("s10");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s10 } = await api("GET", `/products/${productSlug}/`);
      if (s10 !== 200) {
        pass_step("s10", `Correctly blocked – got ${s10}`);
      } else {
        fail_step("s10", "Buyer should NOT see pending product but got 200");
        failed = true;
      }

      // ── Step 11: Admin approve product ────────────────────────────────────
      run_step("s11");
      await new Promise((r) => setTimeout(r, 400));
      const { status: s11 } = await api("POST", `/admin/products/${productId}/approve/`, undefined, adminToken);
      if (s11 === 200) {
        pass_step("s11", `Product ${productId} approved`);
      } else {
        fail_step("s11", `Expected 200, got ${s11}`);
        failed = true;
      }

      // ── Step 12: Buyer can see approved product ───────────────────────────
      run_step("s12");
      await new Promise((r) => setTimeout(r, 800));
      const { status: s12, data: d12 } = await api("GET", `/products/${productSlug}/`);
      if (s12 === 200 && d12?.name === productName) {
        pass_step("s12", `"${d12.name}" visible to buyer`);
      } else {
        fail_step("s12", `Expected 200 + name match, got ${s12}`);
        failed = true;
      }
    } catch (err: any) {
      pushLog(`💥 Error: ${err.message}`);
      // mark remaining idle as skip
      setState((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.status === "idle" || s.status === "running"
            ? { ...s, status: "skip" }
            : s
        ),
      }));
    }

    setState((prev) => ({
      ...prev,
      running: false,
      done: true,
      overallPass: !failed && prev.steps.every((s) => s.status === "pass" || s.status === "skip"),
    }));
    pushLog(failed ? "🔴 Tests finished with FAILURES." : "🟢 ALL TESTS PASSED!");
  }, [setStep, pushLog, state.steps]);

  // ── group steps by phase ───────────────────────────────────────────────────
  const phases = state.steps.reduce<Record<string, Step[]>>((acc, step) => {
    (acc[step.phase] = acc[step.phase] ?? []).push(step);
    return acc;
  }, {});

  const phaseStatus = (steps: Step[]): Status => {
    if (steps.every((s) => s.status === "pass")) return "pass";
    if (steps.some((s) => s.status === "fail")) return "fail";
    if (steps.some((s) => s.status === "running")) return "running";
    return "idle";
  };

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>⚡</div>
          <div>
            <div style={styles.title}>Kashora E2E Test Runner</div>
            <div style={styles.subtitle}>Live API test suite – runs in your browser</div>
          </div>
        </div>
        <button
          style={{
            ...styles.runBtn,
            ...(state.running ? styles.runBtnDisabled : {}),
          }}
          onClick={runTests}
          disabled={state.running}
        >
          {state.running ? (
            <><span style={styles.spinner} /> Running…</>
          ) : state.done ? (
            "↻ Run Again"
          ) : (
            "▶  Run Tests"
          )}
        </button>
      </div>

      {/* ── Overall result banner ── */}
      {state.done && (
        <div
          style={{
            ...styles.banner,
            background: state.overallPass
              ? "linear-gradient(135deg,#0d9488,#059669)"
              : "linear-gradient(135deg,#dc2626,#b91c1c)",
          }}
        >
          {state.overallPass
            ? "🎉 All Tests Passed!"
            : "❌ Some Tests Failed – check steps below"}
        </div>
      )}

      <div style={styles.body}>
        {/* ── Phases + steps ── */}
        <div style={styles.leftPanel}>
          {Object.entries(phases).map(([phase, steps]) => {
            const ps = phaseStatus(steps);
            return (
              <div key={phase} style={styles.phaseCard}>
                <div style={styles.phaseHeader}>
                  <span style={{ ...styles.phaseDot, background: statusColor(ps) }} />
                  <span style={styles.phaseName}>{phase}</span>
                  {ps === "running" && <span style={styles.pulsing}>●</span>}
                </div>
                {steps.map((step) => (
                  <div key={step.id} style={styles.stepRow}>
                    <span style={styles.stepIcon}>{statusIcon(step.status)}</span>
                    <div style={styles.stepBody}>
                      <span
                        style={{
                          ...styles.stepLabel,
                          color: step.status === "running" ? "#facc15" : "#e2e8f0",
                        }}
                      >
                        {step.label}
                      </span>
                      {step.detail && (
                        <span style={styles.stepDetail}>{step.detail}</span>
                      )}
                    </div>
                    {step.ts && <span style={styles.stepTs}>{step.ts}</span>}
                    {step.status === "running" && (
                      <span style={{ ...styles.spinner, marginLeft: 8 }} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {/* idle placeholder */}
          {!state.running && !state.done && (
            <div style={styles.idle}>
              Press <strong>▶ Run Tests</strong> to start the E2E suite
            </div>
          )}
        </div>

        {/* ── Log panel ── */}
        <div style={styles.rightPanel}>
          <div style={styles.logHeader}>📋 Live Log</div>
          <div ref={logRef} style={styles.log}>
            {state.log.length === 0 ? (
              <span style={{ color: "#475569" }}>Logs will appear here…</span>
            ) : (
              state.log.map((line, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.logLine,
                    color: line.includes("FAIL") || line.includes("Error")
                      ? "#f87171"
                      : line.includes("PASS") || line.includes("ALL TESTS")
                      ? "#34d399"
                      : line.includes("Running")
                      ? "#facc15"
                      : "#94a3b8",
                  }}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function statusIcon(s: Status) {
  if (s === "pass")    return <span style={{ color: "#34d399" }}>✔</span>;
  if (s === "fail")    return <span style={{ color: "#f87171" }}>✘</span>;
  if (s === "running") return <span style={{ color: "#facc15" }}>◉</span>;
  if (s === "skip")    return <span style={{ color: "#64748b" }}>–</span>;
  return <span style={{ color: "#334155" }}>○</span>;
}

function statusColor(s: Status) {
  if (s === "pass")    return "#34d399";
  if (s === "fail")    return "#f87171";
  if (s === "running") return "#facc15";
  return "#334155";
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    color: "#e2e8f0",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 32px",
    borderBottom: "1px solid #1e293b",
    background: "rgba(15,23,42,0.8)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 16 },
  logo: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  runBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 28px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 0 20px rgba(99,102,241,0.4)",
    transition: "opacity 0.2s",
  },
  runBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  banner: {
    padding: "14px 32px",
    fontSize: 18,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  body: {
    display: "grid",
    gridTemplateColumns: "1fr 380px",
    gap: 0,
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    padding: "24px 28px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  phaseCard: {
    background: "rgba(30,41,59,0.7)",
    borderRadius: 12,
    border: "1px solid #334155",
    overflow: "hidden",
  },
  phaseHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    background: "rgba(15,23,42,0.6)",
    borderBottom: "1px solid #334155",
  },
  phaseDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0, transition: "background 0.4s" },
  phaseName: { fontWeight: 700, fontSize: 13, color: "#cbd5e1", letterSpacing: 0.3, textTransform: "uppercase" },
  pulsing: { color: "#facc15", marginLeft: "auto", animation: "pulse 1s infinite" },
  stepRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    borderBottom: "1px solid #1e293b",
    transition: "background 0.3s",
  },
  stepIcon: { fontSize: 16, flexShrink: 0, width: 20, textAlign: "center" },
  stepBody: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  stepLabel: { fontSize: 14, fontWeight: 500, transition: "color 0.3s" },
  stepDetail: { fontSize: 12, color: "#64748b" },
  stepTs: { fontSize: 11, color: "#475569", flexShrink: 0 },
  idle: {
    textAlign: "center",
    color: "#475569",
    padding: "40px 16px",
    fontSize: 15,
  },
  rightPanel: {
    background: "#0d1117",
    borderLeft: "1px solid #1e293b",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  logHeader: {
    padding: "14px 16px",
    fontWeight: 700,
    fontSize: 13,
    borderBottom: "1px solid #1e293b",
    letterSpacing: 0.5,
    color: "#64748b",
  },
  log: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace",
    fontSize: 12,
  },
  logLine: { lineHeight: 1.6 },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  },
};
