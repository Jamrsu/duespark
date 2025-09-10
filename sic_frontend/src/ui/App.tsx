import React, { useEffect, useState } from "react";
import { api, request } from "../utils/api";
import type { Envelope, AnalyticsSummary, Template } from "../types/api";

// Light obfuscation for saved tokens (not real encryption)
const OBF_KEY = "DueSpark@2025";
const obfuscate = (plain: string): string => {
  try {
    const key = OBF_KEY;
    const xored = Array.from(plain)
      .map((ch, i) =>
        String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      )
      .join("");
    return btoa(xored);
  } catch {
    return plain;
  }
};
const deobfuscate = (enc: string): string => {
  try {
    const key = OBF_KEY;
    const xored = atob(enc);
    return Array.from(xored)
      .map((ch, i) =>
        String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      )
      .join("");
  } catch {
    return enc;
  }
};

type KPI = { all: number; pending: number; overdue: number; paid: number };

export default function App() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: "info" | "success" | "error";
  } | null>(null);

  const notify = (msg: string, type: "info" | "success" | "error" = "info") => {
    setToast({ msg, type });
    window.clearTimeout((notify as any)._t);
    (notify as any)._t = window.setTimeout(() => setToast(null), 3000);
  };

  // Decode current user email from JWT token (sub)
  const currentUserEmail = React.useMemo(() => {
    try {
      const t = localStorage.getItem("token");
      if (!t) return "";
      const parts = t.split(".");
      if (parts.length < 2) return "";
      const payload = JSON.parse(atob(parts[1]));
      return payload?.sub || "";
    } catch {
      return "";
    }
  }, []);

  const logout = React.useCallback(() => {
    try {
      localStorage.removeItem("token");
    } catch {}
    window.location.reload();
  }, []);

  const loadKpi = React.useCallback(() => {
    request<AnalyticsSummary>({ url: "/analytics/summary", method: "GET" })
      .then((env: Envelope<AnalyticsSummary>) => setKpi(env.data.totals))
      .catch(() => setKpi({ all: 0, pending: 0, overdue: 0, paid: 0 }));
  }, []);
  useEffect(() => {
    loadKpi();
  }, [loadKpi]);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.type === "error" ? "#fee" : "#eef",
            border: `1px solid ${toast.type === "error" ? "#f99" : "#99f"}`,
            borderRadius: 8,
            padding: "8px 12px",
            zIndex: 1000,
          }}
        >
          {toast.msg}
        </div>
      )}
      <header
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h1 style={{ fontSize: 20 }}>DueSpark</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            Starter UI{currentUserEmail ? ` — Signed in as ${currentUserEmail}` : ""}
          </span>
          {currentUserEmail && (
            <button
              onClick={logout}
              title="Log out"
              style={{
                padding: 6,
                border: "1px solid #ccc",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <TokenHelper notify={notify} />
      <AuthTokenSetter />
      <SwitchUser notify={notify} />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 16,
        }}
      >
        <div style={card}>
          <b>All</b>
          <div>{kpi?.all ?? "—"}</div>
        </div>
        <div style={card}>
          <b>Pending</b>
          <div>{kpi?.pending ?? "—"}</div>
        </div>
        <div style={card}>
          <b>Overdue</b>
          <div>{kpi?.overdue ?? "—"}</div>
        </div>
        <div style={card}>
          <b>Paid</b>
          <div>{kpi?.paid ?? "—"}</div>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Clients</h2>
        <ClientsList notify={notify} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Invoices</h2>
        <InvoicesList notify={notify} refreshKpi={loadKpi} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Reminders</h2>
        <RemindersList notify={notify} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Templates</h2>
        <TemplatesManager />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Reminder Preview</h2>
        <ReminderPreview notify={notify} />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>Dead Letters (Admin)</h2>
        <DeadLetters notify={notify} />
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
};

function ReminderPreview({
  notify,
}: {
  notify: (m: string, t?: "info" | "success" | "error") => void;
}) {
  const [invoiceId, setInvoiceId] = useState<number | "">("");
  const [tone, setTone] = useState("friendly");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [invoices, setInvoices] = useState<
    Array<{
      id: number;
      client_id: number;
      amount_cents: number;
      currency: string;
      due_date: string;
      status: string;
    }>
  >([]);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);

  const loadTemplates = async () => {
    const env = await request<Template[]>({
      url: "/templates",
      method: "GET",
      params: { limit: 100, offset: 0 },
    });
    setTemplates(env.data);
  };
  const loadInvoices = async () => {
    const env = await request<typeof invoices>({
      url: "/invoices",
      method: "GET",
      params: { limit: 100, offset: 0 },
    });
    setInvoices(env.data);
  };
  useEffect(() => {
    loadTemplates();
    loadInvoices();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      if (invoiceId === "") {
        notify("Select an invoice first", "error");
        return;
      }
      const body: any = { invoice_id: invoiceId };
      if (templateId !== "") body.template_id = templateId;
      else body.tone = tone;
      const env = await request<{ subject: string; body: string }>({
        url: "/reminders/preview",
        method: "POST",
        data: body,
      });
      setPreview(env.data);
    } catch (e: any) {
      notify(e?.message || "Failed to render preview", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...card }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <label>
          Invoice
          <select
            value={invoiceId}
            onChange={(e) =>
              setInvoiceId(e.target.value === "" ? "" : Number(e.target.value))
            }
            style={input}
          >
            <option value="">— select —</option>
            {invoices.map((i) => (
              <option key={i.id} value={i.id}>
                #{i.id} · {(i.amount_cents / 100).toFixed(2)} {i.currency} · due{" "}
                {i.due_date}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tone
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={input}
            disabled={templateId !== ""}
          >
            <option>friendly</option>
            <option>neutral</option>
            <option>firm</option>
          </select>
        </label>
        <label>
          Template
          <select
            value={templateId}
            onChange={(e) =>
              setTemplateId(e.target.value === "" ? "" : Number(e.target.value))
            }
            style={input}
          >
            <option value="">— none —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.tone})
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={load}
          disabled={loading}
          style={{ ...input, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Loading…" : "Preview"}
        </button>
      </div>
      {preview && (
        <div style={{ marginTop: 12 }}>
          <div>
            <b>Subject:</b> {preview.subject}
          </div>
          <div
            style={{ border: '1px solid #eee', borderRadius: 6, padding: 12, marginTop: 8, background: '#fafafa' }}
            dangerouslySetInnerHTML={{ __html: preview.body }}
          />
        </div>
      )}
    </div>
  );
}

function TemplatesManager() {
  const [items, setItems] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);
  const [name, setName] = useState("Friendly");
  const [tone, setTone] = useState<"friendly" | "neutral" | "firm">("friendly");
  const [subject, setSubject] = useState("Hello {{client_name}}");
  const [body, setBody] = useState("Invoice {{invoice_id}} due {{due_date}}");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState<{
    name: string;
    tone: "friendly" | "neutral" | "firm";
    subject: string;
    body_markdown: string;
  }>({ name: "", tone: "friendly", subject: "", body_markdown: "" });
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async (l = limit, o = offset) => {
    const env = await request<Template[]>({
      url: "/templates",
      method: "GET",
      params: { limit: l, offset: o },
    });
    setItems(env.data);
    setTotal(env.meta.total || 0);
  };
  useEffect(() => {
    load();
  }, []);

  const createItem = async () => {
    setCreating(true);
    try {
      await request({
        url: "/templates",
        method: "POST",
        data: { name, tone, subject, body_markdown: body },
      });
      setName("");
      setSubject("");
      setBody("");
      load();
    } finally {
      setCreating(false);
    }
  };
  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEdit({
      name: t.name,
      tone: t.tone,
      subject: t.subject,
      body_markdown: t.body_markdown,
    });
  };
  const saveEdit = async (id: number) => {
    setSavingId(id);
    try {
      await request({ url: `/templates/${id}`, method: "PUT", data: edit });
      load();
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete template?")) return;
    setDeletingId(id);
    try {
      await request({ url: `/templates/${id}`, method: "DELETE" });
      load();
    } finally {
      setDeletingId(null);
    }
  };

  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const prev = () => {
    const o = Math.max(0, offset - limit);
    setOffset(o);
    load(limit, o);
  };
  const next = () => {
    const o = offset + limit;
    setOffset(o);
    load(limit, o);
  };

  return (
    <div style={{ ...card }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 2fr auto",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as any)}
          style={input}
        >
          <option>friendly</option>
          <option>neutral</option>
          <option>firm</option>
        </select>
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={input}
        />
        <input
          placeholder="Body markdown"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={input}
        />
        <button
          onClick={createItem}
          disabled={creating}
          style={{
            ...input,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          Showing {items.length} of {total}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={prev}
            disabled={!canPrev}
            style={{
              ...input,
              width: 90,
              cursor: canPrev ? "pointer" : "not-allowed",
              opacity: canPrev ? 1 : 0.5,
            }}
          >
            Prev
          </button>
          <button
            onClick={next}
            disabled={!canNext}
            style={{
              ...input,
              width: 90,
              cursor: canNext ? "pointer" : "not-allowed",
              opacity: canNext ? 1 : 0.5,
            }}
          >
            Next
          </button>
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((t) => (
          <li
            key={t.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            {editingId === t.id ? (
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}
              >
                <input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  style={input}
                />
                <select
                  value={edit.tone}
                  onChange={(e) => setEdit({ ...edit, tone: e.target.value as any })}
                  style={input}
                >
                  <option>friendly</option>
                  <option>neutral</option>
                  <option>firm</option>
                </select>
                <input
                  value={edit.subject}
                  onChange={(e) => setEdit({ ...edit, subject: e.target.value })}
                  style={input}
                />
              </div>
            ) : (
              <div>
                <b>{t.name}</b> <span style={{ opacity: 0.7 }}>({t.tone})</span> —{" "}
                {t.subject}
              </div>
            )}
            {editingId === t.id ? (
              <button
                onClick={() => saveEdit(t.id)}
                disabled={savingId === t.id}
                style={{
                  ...input,
                  width: 80,
                  cursor: savingId === t.id ? "not-allowed" : "pointer",
                  opacity: savingId === t.id ? 0.6 : 1,
                }}
              >
                {savingId === t.id ? "Saving…" : "Save"}
              </button>
            ) : (
              <button
                onClick={() => startEdit(t)}
                style={{ ...input, width: 80, cursor: "pointer" }}
              >
                Edit
              </button>
            )}
            {editingId === t.id ? (
              <button
                onClick={() => setEditingId(null)}
                style={{ ...input, width: 80, cursor: "pointer" }}
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => remove(t.id)}
                disabled={deletingId === t.id}
                style={{
                  ...input,
                  width: 80,
                  cursor: deletingId === t.id ? "not-allowed" : "pointer",
                  opacity: deletingId === t.id ? 0.6 : 1,
                }}
              >
                {deletingId === t.id ? "Deleting…" : "Delete"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: 8,
  border: "1px solid #ccc",
  borderRadius: 6,
  width: "100%",
};

function AuthTokenSetter() {
  const [val, setVal] = useState("");
  useEffect(() => {
    try {
      setVal(localStorage.getItem("token") || "");
    } catch {}
  }, []);
  const save = () => {
    try {
      localStorage.setItem("token", val);
    } catch {}
  };
  return (
    <div
      style={{
        ...card,
        marginTop: 16,
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 8,
      }}
    >
      <input
        placeholder="Paste JWT token for API"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={input}
      />
      <button onClick={save} style={{ ...input, cursor: "pointer", width: 120 }}>
        Save Token
      </button>
    </div>
  );
}

function SwitchUser({
  notify,
}: {
  notify: (m: string, t?: "info" | "success" | "error") => void;
}) {
  const [accounts, setAccounts] = useState<Array<{ email: string; token: string }>>([]);
  const [emailInput, setEmailInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");

  const load = () => {
    try {
      setAccounts(JSON.parse(localStorage.getItem("ds_saved_accounts") || "[]"));
    } catch {
      setAccounts([]);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const saveCurrent = () => {
    try {
      const t = localStorage.getItem("token") || tokenInput;
      if (!t) {
        notify("No token to save", "error");
        return;
      }
      const parts = t.split(".");
      let email = emailInput.trim();
      if (parts.length >= 2) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          if (!email) email = (payload?.sub || "").trim();
        } catch {}
      }
      if (!email) {
        notify("Provide an email/label", "error");
        return;
      }
      const list: Array<{ email: string; token: string }> = JSON.parse(
        localStorage.getItem("ds_saved_accounts") || "[]"
      );
      const tokenEnc = obfuscate(t);
      const idx = list.findIndex((a) => a.email === email);
      if (idx >= 0) list[idx].token = tokenEnc;
      else list.push({ email, token: tokenEnc });
      localStorage.setItem("ds_saved_accounts", JSON.stringify(list));
      setEmailInput("");
      setTokenInput("");
      load();
      notify("Saved account", "success");
    } catch {
      notify("Failed to save account", "error");
    }
  };

  const switchTo = (tokenEnc: string) => {
    const token = tokenEnc.includes(".") ? tokenEnc : deobfuscate(tokenEnc);
    try {
      localStorage.setItem("token", token);
    } catch {}
    window.location.reload();
  };

  const remove = (email: string) => {
    const list = accounts.filter((a) => a.email !== email);
    try {
      localStorage.setItem("ds_saved_accounts", JSON.stringify(list));
    } catch {}
    setAccounts(list);
  };

  const createDemoUsers = async () => {
    const created: Array<{ email: string; token: string }> = [];
    for (let i = 0; i < 2; i++) {
      const email = `demo+${Math.random().toString(36).slice(2, 8)}@example.com`;
      try {
        const env = await request<{ access_token: string; token_type: string }>({
          url: "/auth/register",
          method: "POST",
          data: { email, password: "secret123" },
        });
        created.push({ email, token: env.data.access_token });
      } catch (e: any) {
        notify(e?.message || `Failed to create ${email}`, "error");
      }
    }
    if (created.length) {
      try {
        const key = "ds_saved_accounts";
        const list: Array<{ email: string; token: string }> = JSON.parse(
          localStorage.getItem(key) || "[]"
        );
        for (const acc of created) {
          const idx = list.findIndex((a) => a.email === acc.email);
          const tokenEnc = obfuscate(acc.token);
          if (idx >= 0) list[idx].token = tokenEnc;
          else list.push({ email: acc.email, token: tokenEnc });
        }
        localStorage.setItem(key, JSON.stringify(list));
        setAccounts(list);
        notify(`Created ${created.length} demo user(s)`, "success");
      } catch {}
    }
  };

  return (
    <div style={{ ...card, marginTop: 16 }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Switch User</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={createDemoUsers}
          style={{ ...input, cursor: "pointer", width: 180 }}
        >
          Create Demo Users
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr auto",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <input
          placeholder="Email/label"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          style={input}
        />
        <input
          placeholder="Token (optional, uses current if empty)"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          style={input}
        />
        <button onClick={saveCurrent} style={{ ...input, cursor: "pointer" }}>
          Save
        </button>
      </div>
      {accounts.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.8 }}>No saved accounts yet.</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {accounts.map((a) => (
            <li
              key={a.email}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 8,
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <span style={{ fontSize: 12 }}>{a.email}</span>
              <button
                onClick={() => switchTo(a.token)}
                style={{ ...input, width: 90, cursor: "pointer" }}
              >
                Switch
              </button>
              <button
                onClick={() => remove(a.email)}
                style={{ ...input, width: 90, cursor: "pointer" }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeadLetters({ notify }: { notify: (m: string, t?: "info" | "success" | "error") => void }) {
  const [items, setItems] = useState<Array<{ id: number; kind: string; error: string; retries: number; created_at: string }>>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);
  const load = async (l = limit, o = offset) => {
    try {
      const env = await request<typeof items>({ url: "/admin/dead_letters", method: "GET", params: { limit: l, offset: o } });
      setItems(env.data);
      setTotal(env.meta.total || 0);
    } catch (e: any) {
      notify(e?.message || "Failed to load dead letters", "error");
    }
  };
  useEffect(() => {
    load();
  }, []);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const prev = () => {
    const o = Math.max(0, offset - limit);
    setOffset(o);
    load(limit, o);
  };
  const next = () => {
    const o = offset + limit;
    setOffset(o);
    load(limit, o);
  };
  const retry = async (id: number) => {
    try {
      await request({ url: `/admin/dead_letters/${id}/retry`, method: "POST" });
      notify("Marked for retry", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Retry failed", "error");
    }
  };
  const remove = async (id: number) => {
    if (!confirm("Delete dead letter?")) return;
    try {
      await request({ url: `/admin/dead_letters/${id}`, method: "DELETE" });
      notify("Deleted", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Delete failed", "error");
    }
  };
  return (
    <div style={{ ...card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          Showing {items.length} of {total}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={prev} disabled={!canPrev} style={{ ...input, width: 90 }}>
            Prev
          </button>
          <button onClick={next} disabled={!canNext} style={{ ...input, width: 90 }}>
            Next
          </button>
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((d) => (
          <li
            key={d.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div>
              <b>#{d.id}</b> <span style={{ opacity: 0.7 }}>{d.kind}</span>
              <br />
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                {d.error.slice(0, 140)}
                {d.error.length > 140 ? "…" : ""}
              </span>
            </div>
            <button onClick={() => retry(d.id)} style={{ ...input, width: 90, cursor: "pointer" }}>
              Retry
            </button>
            <button onClick={() => remove(d.id)} style={{ ...input, width: 90, cursor: "pointer" }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TokenHelper({
  notify,
}: {
  notify: (m: string, t?: "info" | "success" | "error") => void;
}) {
  const [email, setEmail] = useState("me@example.com");
  const [password, setPassword] = useState("secret123");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const saveToken = (t: string) => {
    try {
      localStorage.setItem("token", t);
      // Also remember this account for quick switching
      try {
        const parts = t.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          const email = (payload?.sub || "").trim();
          if (email) {
            const key = "ds_saved_accounts";
            const list: Array<{ email: string; token: string }> = JSON.parse(
              localStorage.getItem(key) || "[]"
            );
            const tokenEnc = obfuscate(t);
            const idx = list.findIndex((a) => a.email === email);
            if (idx >= 0) list[idx].token = tokenEnc;
            else list.push({ email, token: tokenEnc });
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      } catch {}
    } catch {}
  };
  const register = async () => {
    setStatus("Registering...");
    setLoading(true);
    try {
      const env = await request<{ access_token: string; token_type: string }>({
        url: "/auth/register",
        method: "POST",
        data: { email: email.trim(), password },
      });
      setStatus("Registered. Token issued. Saved to localStorage.");
      saveToken(env.data.access_token);
      notify("Registered and token saved", "success");
      window.location.reload();
    } catch (e: any) {
      setStatus("Already registered or error. Try login.");
      notify(e?.message || "Registration failed or already registered", "error");
    } finally {
      setLoading(false);
    }
  };
  const login = async () => {
    setStatus("Logging in...");
    setLoading(true);
    const body = new URLSearchParams({ username: email.trim(), password });
    try {
      const env = await request<{ access_token: string; token_type: string }>({
        url: "/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: body,
      });
      saveToken(env.data.access_token);
      setStatus("Logged in. Token saved to localStorage.");
      notify("Logged in and token saved", "success");
      window.location.reload();
    } catch (e: any) {
      setStatus("Login failed.");
      notify(e?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ ...card, marginTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />
        <button
          onClick={register}
          disabled={loading}
          style={{
            ...input,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Register
        </button>
        <button
          onClick={login}
          disabled={loading}
          style={{
            ...input,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Login
        </button>
      </div>
      {status && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{status}</div>}
    </div>
  );
}

function ClientsList({
  notify,
}: {
  notify: (m: string, t?: "info" | "success" | "error") => void;
}) {
  const [items, setItems] = useState<
    Array<{ id: number; name: string; email: string; timezone?: string }>
  >([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);
  const [name, setName] = useState("Acme Co");
  const [email, setEmail] = useState("acme@example.com");
  const [timezone, setTimezone] = useState("UTC");
  const load = async (l = limit, o = offset) => {
    const env = await request<{ id: number; name: string; email: string }[]>({
      url: "/clients",
      method: "GET",
      params: { limit: l, offset: o },
    });
    setItems(env.data);
    setTotal(env.meta.total || 0);
  };
  useEffect(() => {
    load();
  }, []);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const prev = () => {
    const o = Math.max(0, offset - limit);
    setOffset(o);
    load(limit, o);
  };
  const next = () => {
    const o = offset + limit;
    setOffset(o);
    load(limit, o);
  };
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTz, setEditTz] = useState("UTC");
  const startEdit = (c: {
    id: number;
    name: string;
    email: string;
    timezone?: string;
  }) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditEmail(c.email);
    setEditTz(c.timezone || "UTC");
  };
  const cancelEdit = () => {
    setEditingId(null);
  };
  const saveEdit = async (id: number) => {
    setSavingId(id);
    try {
      await request({
        url: `/clients/${id}`,
        method: "PUT",
        data: { name: editName, email: editEmail, timezone: editTz },
      });
      notify("Client updated", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Failed to update client", "error");
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  };
  const createClient = async () => {
    setCreating(true);
    try {
      await request({ url: "/clients", method: "POST", data: { name, email, timezone } });
      notify("Client created", "success");
      setName("");
      setEmail("");
      setTimezone("UTC");
      load();
    } catch (e: any) {
      notify(e?.message || "Failed to create client", "error");
    } finally {
      setCreating(false);
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete client?")) return;
    setDeletingId(id);
    try {
      await request({ url: `/clients/${id}`, method: "DELETE" });
      notify("Client deleted", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Failed to delete client", "error");
    } finally {
      setDeletingId(null);
    }
  };
  return (
    <div style={{ ...card }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr auto",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />
        <input
          placeholder="Timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          style={input}
        />
        <button
          onClick={createClient}
          disabled={creating}
          style={{
            ...input,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          Showing {items.length} of {total}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={prev}
            disabled={!canPrev}
            style={{
              ...input,
              width: 90,
              cursor: canPrev ? "pointer" : "not-allowed",
              opacity: canPrev ? 1 : 0.5,
            }}
          >
            Prev
          </button>
          <button
            onClick={next}
            disabled={!canNext}
            style={{
              ...input,
              width: 90,
              cursor: canNext ? "pointer" : "not-allowed",
              opacity: canNext ? 1 : 0.5,
            }}
          >
            Next
          </button>
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((c) => (
          <li
            key={c.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
            }}
          >
            {editingId === c.id ? (
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}
              >
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={input}
                />
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={input}
                />
                <input
                  value={editTz}
                  onChange={(e) => setEditTz(e.target.value)}
                  style={input}
                />
              </div>
            ) : (
              <div>
                <b>{c.name}</b> <span style={{ opacity: 0.7 }}>({c.email})</span>{" "}
                <span style={{ opacity: 0.6 }}>{c.timezone || "UTC"}</span>
              </div>
            )}
            {editingId === c.id ? (
              <button
                onClick={() => saveEdit(c.id)}
                disabled={savingId === c.id}
                style={{
                  ...input,
                  width: 80,
                  cursor: savingId === c.id ? "not-allowed" : "pointer",
                  opacity: savingId === c.id ? 0.6 : (1 as any),
                }}
              >
                {savingId === c.id ? "Saving…" : "Save"}
              </button>
            ) : (
              <button
                onClick={() => startEdit(c)}
                style={{ ...input, width: 80, cursor: "pointer" }}
              >
                Edit
              </button>
            )}
            {editingId === c.id ? (
              <button
                onClick={cancelEdit}
                style={{ ...input, width: 80, cursor: "pointer" }}
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => remove(c.id)}
                disabled={deletingId === c.id}
                style={{
                  ...input,
                  width: 80,
                  cursor: deletingId === c.id ? "not-allowed" : "pointer",
                  opacity: deletingId === c.id ? 0.6 : 1,
                }}
              >
                {deletingId === c.id ? "Deleting…" : "Delete"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvoicesList({
  notify,
  refreshKpi,
}: {
  notify: (m: string, t?: "info" | "success" | "error") => void;
  refreshKpi?: () => void;
}) {
  const [items, setItems] = useState<
    Array<{
      id: number;
      client_id: number;
      amount_cents: number;
      currency: string;
      due_date: string;
      status: string;
      payment_link_url?: string | null;
      paid_at?: string | null;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);
  const [clientId, setClientId] = useState<number | "">("");
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [amount, setAmount] = useState<number>(10000);
  const [currency, setCurrency] = useState("USD");
  const [useCustomCurrency, setUseCustomCurrency] = useState(false);
  const [customCurrency, setCustomCurrency] = useState("");
  const [dueDate, setDueDate] = useState("2030-01-01");
  const [status, setStatus] = useState("pending");
  const [stripeConnected, setStripeConnected] = useState<boolean>(false);
  const load = async (l = limit, o = offset) => {
    const env = await request<typeof items>({
      url: "/invoices",
      method: "GET",
      params: { limit: l, offset: o },
    });
    setItems(env.data);
    setTotal(env.meta.total || 0);
  };
  const loadClients = async () => {
    const env = await request<Array<{ id: number; name: string }>>({
      url: "/clients",
      method: "GET",
      params: { limit: 100, offset: 0 },
    });
    setClients(env.data);
  };
  useEffect(() => {
    load();
    loadClients();
    (async ()=>{ try{ const env = await request<{ connected: boolean }>({ url:'/integrations/stripe/status', method:'GET' }); setStripeConnected(!!env.data.connected) } catch {} })();
  }, []);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const prev = () => {
    const o = Math.max(0, offset - limit);
    setOffset(o);
    load(limit, o);
  };
  const next = () => {
    const o = offset + limit;
    setOffset(o);
    load(limit, o);
  };
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("pending");
  const createPayLink = async (id: number) => {
    try {
      const env = await request<{ payment_link_url: string }>({ url: `/integrations/stripe/payment_link`, method: 'POST', params: { invoice_id: id } })
      notify('Payment link created', 'success')
      try { window.open(env.data.payment_link_url, '_blank') } catch {}
      load()
    } catch (e:any) {
      notify(e?.message || 'Failed to create payment link', 'error')
    }
  }
  const connectStripe = async () => {
    try {
      const env = await request<{ url: string }>({ url:'/integrations/stripe/connect', method:'GET' })
      notify('Redirecting to Stripe…','info')
      window.location.href = env.data.url
    } catch (e:any) {
      notify(e?.message || 'Stripe not configured', 'error')
    }
  }
  const createInvoice = async () => {
    if (clientId === "") {
      notify("Select a client first", "error");
      return;
    }
    setCreating(true);
    try {
      await request({
        url: "/invoices",
        method: "POST",
        data: {
          client_id: clientId,
          amount_cents: amount,
          currency,
          due_date: dueDate,
          status,
        },
      });
      notify("Invoice created", "success");
      load();
      try {
        refreshKpi?.();
      } catch {}
      // refresh KPI totals on parent
      try {
        (refreshKpi as any)?.();
      } catch {}
    } catch (e: any) {
      notify(e?.message || "Failed to create invoice", "error");
    } finally {
      setCreating(false);
    }
  };
  const startEdit = (i: { id: number; status: string }) => {
    setEditingId(i.id);
    setEditStatus(i.status);
  };
  const saveEdit = async (id: number) => {
    setSavingId(id);
    try {
      await request({
        url: `/invoices/${id}`,
        method: "PUT",
        data: { status: editStatus },
      });
      notify("Invoice updated", "success");
      load();
      try {
        refreshKpi?.();
      } catch {}
      try {
        (refreshKpi as any)?.();
      } catch {}
    } catch (e: any) {
      notify(e?.message || "Failed to update invoice", "error");
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete invoice?")) return;
    setDeletingId(id);
    try {
      await request({ url: `/invoices/${id}`, method: "DELETE" });
      notify("Invoice deleted", "success");
      load();
      try {
        refreshKpi?.();
      } catch {}
      try {
        (refreshKpi as any)?.();
      } catch {}
    } catch (e: any) {
      notify(e?.message || "Failed to delete invoice", "error");
    } finally {
      setDeletingId(null);
    }
  };
  return (
    <div style={{ ...card }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <select
          value={clientId}
          onChange={(e) =>
            setClientId(e.target.value === "" ? "" : Number(e.target.value))
          }
          style={input}
        >
          <option value="">— select client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} · {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount cents"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={input}
        />
        <select
          value={useCustomCurrency ? "OTHER" : currency}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "OTHER") {
              setUseCustomCurrency(true);
            } else {
              setUseCustomCurrency(false);
              setCurrency(v);
            }
          }}
          style={input}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="AUD">AUD</option>
          <option value="CAD">CAD</option>
          <option value="INR">INR</option>
          <option value="OTHER">Other…</option>
        </select>
        {useCustomCurrency && (
          <input
            placeholder="Currency (3-letter)"
            value={customCurrency}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().slice(0, 3);
              setCustomCurrency(val);
              setCurrency(val);
            }}
            style={input}
          />
        )}
        <input
          placeholder="Due date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={input}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
          <option>draft</option>
          <option>pending</option>
          <option>paid</option>
          <option>overdue</option>
          <option>cancelled</option>
        </select>
        <button
          onClick={createInvoice}
          disabled={creating}
          style={{
            ...input,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          Showing {items.length} of {total}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={prev}
            disabled={!canPrev}
            style={{
              ...input,
              width: 90,
              cursor: canPrev ? "pointer" : "not-allowed",
              opacity: canPrev ? 1 : 0.5,
            }}
          >
            Prev
          </button>
          <button
            onClick={next}
            disabled={!canNext}
            style={{
              ...input,
              width: 90,
              cursor: canNext ? "pointer" : "not-allowed",
              opacity: canNext ? 1 : 0.5,
            }}
          >
            Next
          </button>
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((i) => (
          <li
            key={i.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
            }}
          >
            <div>
              <b>Invoice #{i.id}</b>{" "}
              <span style={{ opacity: 0.7 }}>Client {i.client_id}</span>
            </div>
            <div>
              {(i.amount_cents / 100).toFixed(2)} {i.currency}
            </div>
            <div>
              due {i.due_date}{" "}
              {editingId === i.id ? (
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ ...input, width: 130 }}
                >
                  <option>draft</option>
                  <option>pending</option>
                  <option>paid</option>
                  <option>overdue</option>
                  <option>cancelled</option>
                </select>
              ) : (
                <span>
                  {i.status}
                  {i.status === 'paid' && i.paid_at ? ` · paid at ${new Date(i.paid_at).toLocaleString()}` : ''}
                </span>
              )}{" "}
              {editingId === i.id ? (
                <>
                  <button
                    onClick={() => saveEdit(i.id)}
                    disabled={savingId === i.id}
                    style={{
                      ...input,
                      width: 80,
                      cursor: savingId === i.id ? "not-allowed" : "pointer",
                      opacity: savingId === i.id ? 0.6 : 1,
                    }}
                  >
                    {savingId === i.id ? "Saving…" : "Save"}
                  </button>{" "}
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ ...input, width: 80, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => startEdit(i)} style={{ ...input, width: 100, cursor: "pointer" }}>Edit</button>
              )}{" "}
              {i.status === 'paid' ? (
                <></>
              ) : i.payment_link_url ? (
                <>
                  <span style={{ padding:'4px 8px', background:'#f6ffed', border:'1px solid #b7eb8f', borderRadius:6, fontSize:12 }}>Created</span>{' '}
                  <button onClick={() => { try { navigator.clipboard.writeText(i.payment_link_url || '') ; notify('Copied link','success') } catch { notify('Copy failed','error') } }} style={{ ...input, width: 100, cursor:'pointer' }}>Copy Link</button>{' '}
                  <button onClick={() => { try { window.open(i.payment_link_url || '', '_blank') } catch {} }} style={{ ...input, width: 80, cursor:'pointer' }}>Open</button>
                </>
              ) : (
                stripeConnected ? (
                  <button onClick={() => createPayLink(i.id)} style={{ ...input, width: 120, cursor: "pointer" }}>Pay Link</button>
                ) : (
                  <button onClick={connectStripe} style={{ ...input, width: 140, cursor: "pointer" }}>Connect Stripe</button>
                )
              )}{" "}
              <button
                onClick={() => remove(i.id)}
                disabled={deletingId === i.id}
                style={{
                  ...input,
                  width: 100,
                  cursor: deletingId === i.id ? "not-allowed" : "pointer",
                  opacity: deletingId === i.id ? 0.6 : 1,
                }}
              >
                {deletingId === i.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RemindersList({
  notify,
}: {
  notify: (m: string, t?: "info" | "success" | "error") => void;
}) {
  const [items, setItems] = useState<
    Array<{
      id: number;
      invoice_id: number;
      send_at: string;
      status: string;
      subject?: string | null;
    }>
  >([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(5);
  const [offset, setOffset] = useState(0);
  const [invoiceId, setInvoiceId] = useState<number | "">("");
  const [invoices, setInvoices] = useState<
    Array<{ id: number; amount_cents: number; currency: string; due_date: string }>
  >([]);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendAt, setSendAt] = useState<string>("2030-01-01T09:00:00Z");
  const [channel, setChannel] = useState<string>("email");
  const allowedChannels = ["email", "sms", "whatsapp"];
  const [useCustomChannel, setUseCustomChannel] = useState(false);
  const [customChannel, setCustomChannel] = useState("");
  const [subject, setSubject] = useState<string>("Payment reminder");
  const [body, setBody] = useState<string>("Please pay when you can.");
  const load = async (l = limit, o = offset) => {
    const env = await request<typeof items>({
      url: "/reminders",
      method: "GET",
      params: { limit: l, offset: o },
    });
    setItems(env.data);
    setTotal(env.meta.total || 0);
  };
  const loadInvoices = async () => {
    const env = await request<typeof invoices>({
      url: "/invoices",
      method: "GET",
      params: { limit: 100, offset: 0 },
    });
    setInvoices(env.data);
  };
  useEffect(() => {
    load();
    loadInvoices();
  }, []);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const prev = () => {
    const o = Math.max(0, offset - limit);
    setOffset(o);
    load(limit, o);
  };
  const next = () => {
    const o = offset + limit;
    setOffset(o);
    load(limit, o);
  };
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSubjectVal, setEditSubjectVal] = useState("");
  const createReminder = async () => {
    if (invoiceId === "") {
      notify("Select an invoice first", "error");
      return;
    }
    if (useCustomChannel && !allowedChannels.includes(channel)) {
      notify("Channel must be one of email, sms, whatsapp", "error");
      return;
    }
    setCreating(true);
    try {
      await request({
        url: "/reminders",
        method: "POST",
        data: { invoice_id: invoiceId, send_at: sendAt, channel, subject, body },
      });
      notify("Reminder created", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Failed to create reminder", "error");
    } finally {
      setCreating(false);
    }
  };
  const startEdit = (r: { id: number; subject?: string | null }) => {
    setEditingId(r.id);
    setEditSubjectVal(r.subject || "");
  };
  const saveEdit = async (id: number) => {
    setSavingId(id);
    try {
      await request({
        url: `/reminders/${id}`,
        method: "PUT",
        data: { subject: editSubjectVal },
      });
      notify("Reminder updated", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Failed to update reminder", "error");
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete reminder?")) return;
    setDeletingId(id);
    try {
      await request({ url: `/reminders/${id}`, method: "DELETE" });
      notify("Reminder deleted", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Failed to delete reminder", "error");
    } finally {
      setDeletingId(null);
    }
  };
  const sendNow = async (id: number) => {
    setSendingId(id);
    try {
      const env = await request<{ message_id?: string; status: string; meta?: any }>({
        url: `/reminders/send-now`,
        method: "POST",
        data: { reminder_id: id },
      });
      const mid = env.data?.message_id || env.data?.meta?.message_id || env.data?.meta?.MessageID || "";
      notify(mid ? `Sent · id ${mid}` : "Sent", "success");
      load();
    } catch (e: any) {
      notify(e?.message || "Send failed", "error");
    } finally {
      setSendingId(null);
    }
  };
  return (
    <div style={{ ...card }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <select
          value={invoiceId}
          onChange={(e) =>
            setInvoiceId(e.target.value === "" ? "" : Number(e.target.value))
          }
          style={input}
        >
          <option value="">— select invoice —</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              #{i.id} · {(i.amount_cents / 100).toFixed(2)} {i.currency} · due{" "}
              {i.due_date}
            </option>
          ))}
        </select>
        <input
          placeholder="Send at (ISO)"
          value={sendAt}
          onChange={(e) => setSendAt(e.target.value)}
          style={input}
        />
        <select
          value={useCustomChannel ? "OTHER" : channel}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "OTHER") {
              setUseCustomChannel(true);
            } else {
              setUseCustomChannel(false);
              setChannel(v);
            }
          }}
          style={input}
        >
          <option value="email">email</option>
          <option value="sms">sms</option>
          <option value="whatsapp">whatsapp</option>
          <option value="OTHER">Other…</option>
        </select>
        {useCustomChannel && (
          <input
            placeholder="Channel (email/sms/whatsapp)"
            value={customChannel}
            onChange={(e) => {
              const v = e.target.value.toLowerCase();
              setCustomChannel(v);
              setChannel(v);
            }}
            style={input}
          />
        )}
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={input}
        />
        <input
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={input}
        />
        <button
          onClick={createReminder}
          disabled={creating}
          style={{
            ...input,
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          Showing {items.length} of {total}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={prev}
            disabled={!canPrev}
            style={{
              ...input,
              width: 90,
              cursor: canPrev ? "pointer" : "not-allowed",
              opacity: canPrev ? 1 : 0.5,
            }}
          >
            Prev
          </button>
          <button
            onClick={next}
            disabled={!canNext}
            style={{
              ...input,
              width: 90,
              cursor: canNext ? "pointer" : "not-allowed",
              opacity: canNext ? 1 : 0.5,
            }}
          >
            Next
          </button>
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((r) => (
          <li
            key={r.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 8,
            }}
          >
            <div>
              <b>Reminder #{r.id}</b>{" "}
              <span style={{ opacity: 0.7 }}>Inv {r.invoice_id}</span>
              <br />
              {editingId === r.id ? (
                <input
                  value={editSubjectVal}
                  onChange={(e) => setEditSubjectVal(e.target.value)}
                  style={{ ...input, width: "100%" }}
                />
              ) : (
                <span style={{ opacity: 0.8 }}>{r.subject || "—"}</span>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              {r.status} · {new Date(r.send_at).toLocaleString()}{" "}
              {editingId === r.id ? (
                <>
                  <button
                    onClick={() => saveEdit(r.id)}
                    disabled={savingId === r.id}
                    style={{
                      ...input,
                      width: 90,
                      cursor: savingId === r.id ? "not-allowed" : "pointer",
                      opacity: savingId === r.id ? 0.6 : 1,
                    }}
                  >
                    {savingId === r.id ? "Saving…" : "Save"}
                  </button>{" "}
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ ...input, width: 90, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEdit(r)}
                  style={{ ...input, width: 90, cursor: "pointer" }}
                >
                  Edit
                </button>
              )}{" "}
              <button
                onClick={() => sendNow(r.id)}
                disabled={sendingId === r.id}
                style={{
                  ...input,
                  width: 100,
                  cursor: sendingId === r.id ? "not-allowed" : "pointer",
                  opacity: sendingId === r.id ? 0.6 : 1,
                }}
              >
                {sendingId === r.id ? "Sending…" : "Send now"}
              </button>{" "}
              <button
                onClick={() => remove(r.id)}
                disabled={deletingId === r.id}
                style={{
                  ...input,
                  width: 90,
                  cursor: deletingId === r.id ? "not-allowed" : "pointer",
                  opacity: deletingId === r.id ? 0.6 : 1,
                }}
              >
                {deletingId === r.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
