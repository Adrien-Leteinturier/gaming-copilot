import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  Gamepad2,
  LayoutDashboard,
  Cpu,
  MessageSquare,
  TrendingDown,
  ArrowUpRight,
  ChevronRight,
  Bell,
  Send,
  LogIn,
  LogOut,
  Check,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import {
  auth,
  cloudReady,
  login,
  logout,
  loadCloud,
  saveConfig,
  saveAlert,
  removeAlert,
  saveMessages,
} from "./firebase";
import {
  configSchema,
  emptyConfig,
  fields,
  type PcConfig,
  type Alert,
  type Message,
} from "./domain";
import Dashboard from "./components/Dashboard";
import HardwareDetection from "./components/HardwareDetection";
import { applyHardwareReport, type HardwareReport } from "./hardware";
type Page = "Dashboard" | "Ma Config" | "Assistant" | "Prix";
const nav = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Ma Config", icon: Cpu },
  { name: "Assistant", icon: MessageSquare },
  { name: "Prix", icon: TrendingDown },
] as const;
function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export default function App() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!auth);
  const [config, setConfig] = useState<PcConfig>(() =>
    readLocal("gc.config", emptyConfig),
  );
  const [draft, setDraft] = useState(config);
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    readLocal("gc.alerts", []),
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    readLocal("gc.messages", []),
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [component, setComponent] = useState("");
  const [target, setTarget] = useState("");
  const report = (e: unknown) =>
    setNotice(e instanceof Error ? e.message : "Une erreur est survenue.");
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setReady(false);
      setUser(u);
      try {
        if (u) {
          const data = await loadCloud(u.uid);
          setConfig(data.config ?? emptyConfig);
          setDraft(data.config ?? emptyConfig);
          setAlerts(data.alerts);
          setMessages(data.messages);
        } else {
          const local = readLocal("gc.config", emptyConfig);
          setConfig(local);
          setDraft(local);
          setAlerts(readLocal("gc.alerts", []));
          setMessages(readLocal("gc.messages", []));
        }
      } catch (e) {
        setConfig(emptyConfig);
        setDraft(emptyConfig);
        setAlerts([]);
        setMessages([]);
        report(e);
      } finally {
        setReady(true);
      }
    });
  }, []);
  async function persistConfig() {
    setBusy(true);
    try {
      const value = configSchema.parse(draft);
      if (user) await saveConfig(user.uid, value);
      else localStorage.setItem("gc.config", JSON.stringify(value));
      setConfig(value);
      setNotice(
        user
          ? "Configuration synchronisée."
          : "Configuration enregistrée sur cet appareil.",
      );
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function addAlert(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(target);
    if (!component.trim() || !Number.isFinite(amount) || amount <= 0) {
      setNotice("Indiquez un composant et un seuil positif.");
      return;
    }
    const alert: Alert = {
      id: crypto.randomUUID(),
      component: component.trim(),
      target: amount,
      currency: "EUR",
      status: "pending-provider",
      createdAt: new Date().toISOString(),
    };
    setBusy(true);
    try {
      if (user) await saveAlert(user.uid, alert);
      else
        localStorage.setItem("gc.alerts", JSON.stringify([...alerts, alert]));
      setAlerts([...alerts, alert]);
      setComponent("");
      setTarget("");
      setNotice("Seuil enregistré. La surveillance attend une source de prix.");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function deleteAlert(id: string) {
    try {
      if (user) await removeAlert(user.uid, id);
      else
        localStorage.setItem(
          "gc.alerts",
          JSON.stringify(alerts.filter((a) => a.id !== id)),
        );
      setAlerts(alerts.filter((a) => a.id !== id));
    } catch (e) {
      report(e);
    }
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || busy) return;
    const question = prompt.trim();
    setBusy(true);
    try {
      if (!user) {
        setNotice(
          "Connectez Firebase puis votre compte pour utiliser l’assistant IA.",
        );
        return;
      }
      const token = await user.getIdToken();
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: question }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Assistant indisponible");
      const next: Message[] = [
        ...messages,
        { role: "user", content: question },
        { role: "assistant", content: data.reply },
      ];
      await saveMessages(user.uid, next);
      setMessages(next);
      setPrompt("");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const applyDetected = (report: HardwareReport) => {
    setDraft((current) => applyHardwareReport(current, report));
    setManualOpen(true);
    setNotice(
      "Composants ajoutés à la fiche. Vérifiez-les, puis enregistrez votre configuration.",
    );
  };
  const filled = Object.keys(fields).filter((k) =>
    config[k as keyof typeof fields].trim(),
  ).length;
  const gotoAssistant = (text: string) => {
    setPrompt(text);
    setPage("Assistant");
  };
  return (
    <div className="app">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Dashboard");
          }}
        >
          <span className="brand-icon">
            <Gamepad2 />
          </span>
          <span>
            gaming
            <span className="brand-sub">
              copilot<span className="dot">.</span>
            </span>
          </span>
        </a>
        <div className="nav-label">VOTRE ESPACE</div>
        <nav>
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={page === name ? "selected" : ""}
              onClick={() => setPage(name)}
            >
              <Icon size={19} />
              {name}
              {page === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-card">
          <Cpu size={22} />
          <strong>Le matériel d’abord.</strong>
          <p>
            Un inventaire pour savoir ce que vous avez, avant de décider quoi
            changer.
          </p>
          <button onClick={() => setPage("Assistant")}>
            Ouvrir l’assistant <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="side-bottom">
          <span className="connection-dot" />
          {cloudReady ? "Firebase configuré" : "Espace local"}
          <small>Gaming Copilot · MVP</small>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <span>
            <span className="muted">Mon espace</span>
            <ChevronRight size={14} />
            {page}
          </span>
          <button
            className="account"
            onClick={() => {
              (user ? logout() : login()).catch(report);
            }}
          >
            {user ? <LogOut size={16} /> : <LogIn size={16} />}{" "}
            {user?.displayName ?? "Se connecter"}
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div className="eyebrow">GAMING COPILOT / ATELIER PC</div>
            <h1>
              {page === "Dashboard"
                ? "Le point sur votre PC."
                : page === "Ma Config"
                  ? "Identifier votre matériel."
                  : page === "Assistant"
                    ? "Parlons de votre setup."
                    : "Votre liste d’achat."}
            </h1>
            <p>
              {page === "Dashboard"
                ? "Votre inventaire, vos objectifs et les prochaines choses à vérifier."
                : page === "Ma Config"
                  ? "Détection Windows, import de rapport ou saisie manuelle : choisissez ce qui vous convient."
                  : page === "Assistant"
                    ? "Une question de compatibilité, de réglages ou de prochain achat ?"
                    : "Gardez les composants que vous cherchez et le budget que vous leur accordez."}
            </p>
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Fermer">
                ×
              </button>
            </div>
          )}
          {!ready ? (
            <div className="panel">Chargement de votre espace…</div>
          ) : (
            <>
              {page === "Dashboard" && (
                <Dashboard
                  config={config}
                  alertsCount={alerts.length}
                  openConfig={() => setPage("Ma Config")}
                  openAssistant={() => setPage("Assistant")}
                  openPrices={() => setPage("Prix")}
                />
              )}
              {page === "Ma Config" && (
                <>
                  <HardwareDetection config={draft} onApply={applyDetected} />
                  <details
                    className="manual-editor"
                    open={manualOpen}
                    onToggle={(e) => setManualOpen(e.currentTarget.open)}
                  >
                    <summary>
                      Vérifier la fiche ou saisir mes composants manuellement
                    </summary>
                    <div className="config-layout">
                      <form
                        className="panel config-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void persistConfig();
                        }}
                      >
                        <div className="section-title">
                          <h3>
                            <Cpu size={20} /> Ma configuration
                          </h3>
                          <span>{user ? "Cloud" : "Stockage local"}</span>
                        </div>
                        <label>
                          Nom du setup
                          <input
                            maxLength={100}
                            value={draft.name}
                            onChange={(e) =>
                              setDraft({ ...draft, name: e.target.value })
                            }
                          />
                        </label>
                        <div className="form-grid">
                          {Object.entries(fields).map(([key, label]) => (
                            <label key={key}>
                              {label}
                              <input
                                maxLength={150}
                                placeholder={`Renseigner : ${label.toLowerCase()}`}
                                value={draft[key as keyof typeof fields]}
                                onChange={(e) =>
                                  setDraft({ ...draft, [key]: e.target.value })
                                }
                              />
                            </label>
                          ))}
                          <label>
                            Résolution cible
                            <select
                              value={draft.resolution}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  resolution: e.target
                                    .value as PcConfig["resolution"],
                                })
                              }
                            >
                              {["1080p", "1440p", "4K"].map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Objectif FPS
                            <input
                              type="number"
                              min={30}
                              max={500}
                              required
                              value={draft.targetFps}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  targetFps: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                        <button className="primary" disabled={busy}>
                          <Check size={18} />
                          {busy ? "Enregistrement…" : "Enregistrer mon setup"}
                        </button>
                      </form>
                      <div className="panel tips">
                        <ShieldCheck />
                        <h3>Ce que Windows ne dit pas.</h3>
                        <p>
                          Vérifiez l’alimentation, les dimensions du boîtier et
                          les références OEM. La détection ne certifie pas la
                          compatibilité.
                        </p>
                        <p>
                          Les FPS indiqués sont votre objectif. Aucun benchmark
                          n’est déduit de votre configuration.
                        </p>
                        <span className="pill">
                          {filled}/6 composants enregistrés
                        </span>
                      </div>
                    </div>
                  </details>
                </>
              )}
              {page === "Assistant" && (
                <div className="assistant-layout">
                  <section className="panel chat">
                    <div className="chat-header">
                      <span className="brand-icon">
                        <MessageSquare />
                      </span>
                      <div>
                        <strong>Gaming Copilot</strong>
                        <small>
                          {user
                            ? "Votre configuration enregistrée sert de contexte"
                            : "Connexion requise pour l’IA"}
                        </small>
                      </div>
                    </div>
                    <div className="messages" aria-live="polite">
                      {!messages.length ? (
                        <div className="chat-empty">
                          <MessageSquare size={38} />
                          <h2>Qu’est-ce que vous voulez vérifier ?</h2>
                          <p>Votre fiche matériel sert de point de départ.</p>
                          <div className="suggestions">
                            {[
                              "Analyse ma configuration",
                              "Que vérifier avant un upgrade ?",
                              "Aide-moi à régler mon jeu",
                            ].map((s) => (
                              <button key={s} onClick={() => setPrompt(s)}>
                                {s}
                                <ArrowUpRight size={14} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        messages.map((m, i) => (
                          <div key={i} className={`message ${m.role}`}>
                            <small>
                              {m.role === "user" ? "Vous" : "Copilot"}
                            </small>
                            <p>{m.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form className="composer" onSubmit={ask}>
                      <input
                        aria-label="Votre question"
                        maxLength={2000}
                        placeholder="Demandez quelque chose à votre copilote…"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                      <button
                        className="primary"
                        disabled={busy || !prompt.trim()}
                        aria-label="Envoyer"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                    <small className="chat-note">
                      Les conseils de l’IA doivent être confrontés aux fiches
                      constructeur.
                    </small>
                  </section>
                  <div className="panel tips">
                    <Cpu />
                    <h3>{config.name}</h3>
                    {Object.entries(fields).map(([k, label]) => (
                      <div className="component-line" key={k}>
                        <small>{label}</small>
                        <span>
                          {config[k as keyof typeof fields] || "À renseigner"}
                        </span>
                      </div>
                    ))}
                    <button
                      className="secondary"
                      onClick={() => setPage("Ma Config")}
                    >
                      Modifier ma config
                    </button>
                  </div>
                </div>
              )}
              {page === "Prix" && (
                <>
                  <div className="provider-banner">
                    <ShieldCheck />
                    <div>
                      <strong>
                        Le suivi des prix n’est pas encore connecté.
                      </strong>
                      <p>
                        Aucune source marchande connectée. Les seuils sont
                        enregistrés ; la surveillance et les notifications sont
                        en attente.
                      </p>
                    </div>
                    <span className="pill">À connecter</span>
                  </div>
                  <div className="config-layout">
                    <form className="panel config-form" onSubmit={addAlert}>
                      <h3>
                        <Bell size={20} /> Créer un seuil de prix
                      </h3>
                      <label>
                        Référence du composant
                        <input
                          required
                          maxLength={150}
                          placeholder="Référence exacte du composant"
                          value={component}
                          onChange={(e) => setComponent(e.target.value)}
                        />
                      </label>
                      <label>
                        Mon prix cible (€)
                        <input
                          required
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={target}
                          onChange={(e) => setTarget(e.target.value)}
                          placeholder="Votre budget, pas un prix marchand"
                        />
                      </label>
                      <button className="primary" disabled={busy}>
                        <Bell size={17} />
                        Enregistrer le seuil
                      </button>
                    </form>
                    <div className="panel tips">
                      <TrendingDown />
                      <h3>Votre liste de suivi</h3>
                      {!alerts.length ? (
                        <p>
                          Aucun seuil pour le moment. Ajoutez votre premier
                          composant.
                        </p>
                      ) : (
                        alerts.map((a) => (
                          <div className="alert-row" key={a.id}>
                            <div>
                              <strong>{a.component}</strong>
                              <small>
                                Objectif : {a.target.toLocaleString("fr-FR")} €
                              </small>
                              <small>Source en attente</small>
                            </div>
                            <button
                              aria-label={`Supprimer ${a.component}`}
                              onClick={() => deleteAlert(a.id)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
          <footer>
            <span>GAMING COPILOT</span>
            <a href="/decouvrir">Découvrir le projet</a>
            <a href="/guides/identifier-composants-pc">Guide matériel</a>
            <button
              onClick={() =>
                gotoAssistant(
                  "Quelles informations manquent dans ma configuration ?",
                )
              }
            >
              Besoin d’un conseil ? <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
