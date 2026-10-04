import {
  decodeChats,
  encodeChats,
  createDiscussion,
  updateDiscussion,
  deleteDiscussion,
  MAX_DISCUSSIONS,
  type ChatStore,
} from "./discussions";
import { readSavedReferences, keepReference } from "./prices";
import AssistantText from "./components/AssistantText";
import { quickReply } from "./agent/quick";
import { recommendProfile } from "./recommendations";
import { useEffect, useRef, useState } from "react";
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
  saveChats,
} from "./firebase";
import {
  configSchema,
  emptyConfig,
  fields,
  type PcConfig,
  type Alert,
  type Message,
} from "./domain";
import PriceSearch from "./components/PriceSearch";
import type { ModelMode } from "./agent/local";
import { cleanModelReply } from "./agent/context";
import Dashboard from "./components/Dashboard";
import HardwareDetection from "./components/HardwareDetection";
import {
  decodeCollectorReturn,
  applyHardwareReport,
  type HardwareReport,
} from "./hardware";
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
export default function App({
  collectorFragment = "",
}: {
  collectorFragment?: string;
}) {
  const [page, setPage] = useState<Page>("Dashboard");
  const [user, setUser] = useState<User | null>(null);
  const userUid = useRef<string | null>(null);
  const [ready, setReady] = useState(!auth);
  const [config, setConfig] = useState<PcConfig>(() =>
    readLocal("gc.config", emptyConfig),
  );
  const [draft, setDraft] = useState(config);
  const [alerts, setAlerts] = useState<Alert[]>(() =>
    readLocal("gc.alerts", []),
  );
  const [chatStore, setChatStore] = useState<ChatStore>(() =>
    decodeChats(readLocal("gc.chats.guest", readLocal("gc.messages", []))),
  );
  const messages =
    chatStore.threads.find((t) => t.id === chatStore.activeId)?.messages ?? [];
  const chatStoreRef = useRef(chatStore);
  function restoreChats(store: ChatStore) {
    chatStoreRef.current = store;
    setChatStore(store);
  }
  async function persistChats(store: ChatStore) {
    const uid = userUid.current;
    const normalized = decodeChats(encodeChats(store));
    if (uid) await saveChats(uid, normalized);
    else
      localStorage.setItem(
        "gc.chats.guest",
        JSON.stringify(encodeChats(normalized)),
      );
    if (userUid.current !== uid) return;
    restoreChats(normalized);
  }
  async function changeDiscussion(
    action: "new" | "select" | "delete",
    id?: string,
  ) {
    if (busy || modelState === "loading") return;
    setBusy(true);
    try {
      const current = chatStoreRef.current;
      const next =
        action === "new"
          ? createDiscussion(current)
          : action === "delete"
            ? deleteDiscussion(current, id!)
            : { ...current, activeId: id! };
      await persistChats(next);
      setPrompt("");
      setPendingQuestion("");
      setAssistantError("");
      setLiveReply("");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const [manualOpen, setManualOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const messagesView = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (page === "Assistant") {
      messagesView.current?.scrollTo({ top: messagesView.current.scrollHeight, behavior: "instant" });
      chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [page, chatStore.activeId, pendingQuestion, messages, busy, assistantError]);
  const [component, setComponent] = useState("");
  const [target, setTarget] = useState("");
  const [modelMode, setModelMode] = useState<ModelMode>(() => {
    try {
      return localStorage.getItem("gc.modelMode") === "balanced"
        ? "balanced"
        : "light";
    } catch {
      return "light";
    }
  });
  const [modelState, setModelState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [liveReply, setLiveReply] = useState("");
  const [priceQuery, setPriceQuery] = useState("");
  const [priceActivation, setPriceActivation] = useState(0);
  const [savedReferences, setSavedReferences] = useState<string[]>(() =>
    readSavedReferences("gc.savedRefs.guest"),
  );
  const referenceKey = "gc.savedRefs." + (user?.uid ?? "guest");
  useEffect(() => {
    setSavedReferences(readSavedReferences(referenceKey));
  }, [referenceKey]);
  const [priceTarget, setPriceTarget] = useState<number | undefined>();
  const modelCancelRequested = useRef(false);
  const localAgent = useRef<Awaited<
    ReturnType<typeof importLocalAgent>
  > | null>(null);
  function importLocalAgent() {
    return import("./agent/local");
  }
  const [cachedModes, setCachedModes] = useState<ModelMode[]>([]);
  const [cacheChecked, setCacheChecked] = useState(false);
  const modelCached = cachedModes.includes(modelMode);
  const modelAction = modelCached
    ? "Réutiliser le modèle enregistré"
    : `Télécharger le modèle (${modelMode === "light" ? "~400 Mo" : "~900 Mo"})`;
  useEffect(() => {
    if (page !== "Assistant") return;
    let active = true;
    void importLocalAgent()
      .then(async (agent) => {
        const cached = await agent.cachedModelModes();
        if (!active) return;
        setCachedModes(cached);
        setCacheChecked(true);
        if (
          modelState === "idle" &&
          cached.length &&
          !cached.includes(modelMode)
        )
          setModelMode(cached[0]);
      })
      .catch(() => {
        if (active) setCacheChecked(true);
      });
    return () => {
      active = false;
    };
  }, [page, modelState]);
  async function initializeModel() {
    if (!cacheChecked || modelState === "loading" || modelState === "ready")
      return;
    const questionToAnswer = pendingQuestion;
    const loadingUid = userUid.current;
    modelCancelRequested.current = false;
    setAssistantError("");
    setModelState("loading");
    setModelProgress(0);
    try {
      const agent = await importLocalAgent();
      localAgent.current = agent;
      if (modelCancelRequested.current) throw Error("MODEL_LOAD_CANCELLED");
      await agent.loadLocalModel(modelMode, (p) =>
        setModelProgress(
          Math.round(Math.max(0, Math.min(1, p.progress)) * 100),
        ),
      );
      setModelState("ready");
      try {
        localStorage.setItem("gc.modelMode", modelMode);
      } catch {
        /* Storage may be unavailable. */
      }
      setCachedModes(await agent.cachedModelModes());
      setNotice(
        "Modèle prêt. Les réponses sont calculées sur cet appareil, sans API payante.",
      );
      if (questionToAnswer && userUid.current === loadingUid)
        await answerQuestion(questionToAnswer, agent);
    } catch (e) {
      if (e instanceof Error && e.message === "MODEL_LOAD_CANCELLED") {
        setModelState("idle");
        setNotice(
          "Chargement arrêté. Les fichiers déjà téléchargés peuvent rester en cache.",
        );
      } else {
        setModelState("error");
        setAssistantError(
          e instanceof Error ? e.message : "Le modèle n’a pas pu démarrer.",
        );
        report(e);
      }
    }
  }
  async function releaseModel() {
    await localAgent.current?.unloadLocalModel();
    setModelState("idle");
    setModelProgress(0);
  }
  useEffect(
    () => () => {
      localAgent.current?.cancelLocalModelLoad();
      void localAgent.current?.unloadLocalModel();
    },
    [],
  );
  const report = (e: unknown) =>
    setNotice(e instanceof Error ? e.message : "Une erreur est survenue.");
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (u) => {
      setReady(false);
      userUid.current = u?.uid ?? null;
      localAgent.current?.stopLocalReply();
      setUser(u);
      try {
        if (u) {
          const data = await loadCloud(u.uid);
          if (userUid.current !== u.uid) return;
          setConfig(data.config ?? emptyConfig);
          setDraft(data.config ?? emptyConfig);
          setAlerts(data.alerts);
          restoreChats(data.chatStore);
        } else {
          const local = readLocal("gc.config", emptyConfig);
          setConfig(local);
          setDraft(local);
          setAlerts(readLocal("gc.alerts", []));
          restoreChats(
            decodeChats(
              readLocal("gc.chats.guest", readLocal("gc.messages", [])),
            ),
          );
        }
      } catch (e) {
        setConfig(emptyConfig);
        setDraft(emptyConfig);
        setAlerts([]);
        restoreChats({ threads: [], activeId: null });
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
      setPriceQuery(alert.component);
      setPriceTarget(alert.target);
      setPriceActivation((v) => v + 1);
      setComponent("");
      setTarget("");
      setNotice(
        "Seuil enregistré et appliqué. La recherche affiche uniquement les offres dans votre budget, hors livraison.",
      );
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
    if (!prompt.trim() || busy || modelState === "loading") return;
    if (pendingQuestion === prompt.trim() && modelState !== "ready") {
      await initializeModel();
      return;
    }
    await answerQuestion(
      prompt.trim(),
      modelState === "ready" ? localAgent.current : null,
    );
  }
  async function answerQuestion(
    question: string,
    agent: typeof localAgent.current,
  ) {
    const askingUid = user?.uid ?? null;
    setBusy(true);
    setPendingQuestion(question);
    setAssistantError("");
    setLiveReply("");
    try {
      let reply = agent
        ? await agent.localReply(question, messages, config, setLiveReply)
        : await quickReply(question, config, messages);
      if (reply === null) {
        if (!agent) {
          setPendingQuestion(question);
          setNotice(
            "Cette question nécessite le modèle local. Cliquez sur « Charger et répondre » ; votre question est conservée. Les analyses de configuration et les prix fonctionnent sans téléchargement.",
          );
          return;
        }
        reply = await agent.localReply(
          question,
          messages,
          config,
          setLiveReply,
        );
      }
      setPendingQuestion("");
      if (userUid.current !== askingUid) return;
      const next: Message[] = [
        ...messages,
        { role: "user" as const, content: question },
        { role: "assistant" as const, content: reply },
      ].slice(-50);
      await persistChats(updateDiscussion(chatStoreRef.current, next));
      setPrompt("");
      setLiveReply("");
    } catch (e) {
      setAssistantError(
        e instanceof Error
          ? e.message
          : "La réponse a échoué. Votre question est conservée.",
      );
      if (e instanceof Error && e.message.includes("MODEL_TIMEOUT"))
        setModelState("error");
      report(e);
    } finally {
      setBusy(false);
      setLiveReply("");
    }
  }
  const [detectOnOpen, setDetectOnOpen] = useState(false);
  const applyDetected = async (report: HardwareReport) => {
    setDetectOnOpen(false);
    const next = applyHardwareReport(draft, report);
    const profile = recommendProfile(next);
    const value = configSchema.parse({
      ...next,
      resolution: profile.resolution,
      targetFps: profile.fps,
    });
    if (user) await saveConfig(user.uid, value);
    else localStorage.setItem("gc.config", JSON.stringify(value));
    setDraft(value);
    setConfig(value);
    setNotice(
      report.platform === "browser"
        ? "Détection partielle terminée. Fiche et profil de départ mis à jour."
        : "Matériel enregistré. Profil de départ calculé automatiquement.",
    );
  };
  const collectorReceived = useRef(false);
  useEffect(() => {
    if (!ready || !collectorFragment || collectorReceived.current) return;
    collectorReceived.current = true;
    setPage("Ma Config");
    try {
      const reportValue = decodeCollectorReturn(collectorFragment);
      if (reportValue) void applyDetected(reportValue).catch(report);
    } catch (error) {
      report(error);
    }
  }, [ready, collectorFragment]);
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
              aria-current={page === name ? "page" : undefined}
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
          <strong>Le prochain move ?</strong>
          <p>Une question sur votre PC ? Commencez avec votre configuration.</p>
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
            <div className="eyebrow">VOTRE PC, VOS RÈGLES</div>
            <h1>
              {page === "Dashboard"
                ? "Votre setup. À vous de jouer."
                : page === "Ma Config"
                  ? "Identifier votre matériel."
                  : page === "Assistant"
                    ? "Parlons de votre setup."
                    : "Votre liste d’achat."}
            </h1>
            <p>
              {page === "Dashboard"
                ? "Tout votre matériel au même endroit. La suite, c’est vous qui décidez."
                : page === "Ma Config"
                  ? "Lancez la détection : votre fiche se remplit et votre profil de jeu est proposé automatiquement."
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
                  detectHardware={() => {
                    setDetectOnOpen(true);
                    setPage("Ma Config");
                  }}
                  openAssistant={() => setPage("Assistant")}
                  openPrices={() => setPage("Prix")}
                />
              )}
              {page === "Ma Config" && (
                <>
                  <HardwareDetection
                    config={draft}
                    onApply={applyDetected}
                    autoStart={detectOnOpen}
                  />
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
                            Résolution personnalisée (optionnel)
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
                            Fluidité souhaitée (optionnel)
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
                          Le profil automatique est une estimation de départ.
                          Vérifiez la fluidité dans vos jeux ; les préférences
                          ci-dessus restent modifiables.
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
                    <div
                      className="discussion-bar"
                      aria-label="Discussions enregistrées"
                    >
                      <div className="section-title">
                        <strong>
                          Discussions · {chatStore.threads.length}/
                          {MAX_DISCUSSIONS}
                        </strong>
                        <button
                          className="secondary"
                          disabled={
                            busy ||
                            modelState === "loading" ||
                            chatStore.threads.length >= MAX_DISCUSSIONS
                          }
                          onClick={() => void changeDiscussion("new")}
                        >
                          Nouvelle discussion
                        </button>
                      </div>
                      <p className="muted">
                        {user
                          ? "Enregistrées dans votre compte."
                          : "Enregistrées dans ce navigateur."}{" "}
                        Retour automatique à la dernière discussion ouverte.{" "}
                        {chatStore.threads.length >= MAX_DISCUSSIONS &&
                          "Limite atteinte : supprimez une discussion pour en créer une autre."}
                      </p>
                      <div className="discussion-list">
                        {chatStore.threads.map((thread) => (
                          <div
                            className={
                              thread.id === chatStore.activeId
                                ? "discussion-item active"
                                : "discussion-item"
                            }
                            key={thread.id}
                          >
                            <button
                              aria-pressed={thread.id === chatStore.activeId}
                              disabled={busy || modelState === "loading"}
                              onClick={() =>
                                void changeDiscussion("select", thread.id)
                              }
                            >
                              <strong>{thread.title}</strong>
                              <small>
                                {
                                  thread.messages.filter(
                                    (m) => m.role === "user",
                                  ).length
                                }{" "}
                                échange(s)
                              </small>
                            </button>
                            <button
                              className="text-button"
                              aria-label={
                                "Supprimer la discussion " + thread.title
                              }
                              disabled={busy || modelState === "loading"}
                              onClick={() =>
                                void changeDiscussion("delete", thread.id)
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {!chatStore.threads.length && (
                        <p className="muted">
                          Votre premier échange créera une discussion.
                        </p>
                      )}
                    </div>
                    <div className="chat-header">
                      <span className="brand-icon">
                        <MessageSquare />
                      </span>
                      <div>
                        <strong>Gaming Copilot</strong>
                        <small>
                          {modelState === "ready"
                            ? "Conversation IA · modèle local actif"
                            : "Conseils vérifiés · activez le modèle pour discuter"}
                        </small>
                      </div>
                    </div>
                    <div className="local-model-panel">
                      <div>
                        <strong>Un assistant qui tourne chez vous.</strong>
                        <p>
                          Conseils vérifiés disponibles immédiatement. Activez
                          le modèle pour une conversation adaptée à vos
                          questions : aucune clé API, aucun coût par question.
                          Le modèle se télécharge uniquement après votre clic et
                          reste en cache si le navigateur le permet.
                        </p>
                      </div>
                      <p role="status">
                        {!cacheChecked
                          ? "Vérification des modèles enregistrés…"
                          : modelCached
                            ? "Modèle présent sur cet appareil : ses fichiers seront réutilisés. Le démarrage remet le modèle en mémoire graphique."
                            : "Ce modèle n’est pas conservé intégralement dans ce navigateur. Son téléchargement nécessite votre clic."}{" "}
                        {cacheChecked &&
                          cachedModes.length > 0 &&
                          `Modèles en cache : ${cachedModes.map((mode) => (mode === "light" ? "Qwen3 0.6B" : "Qwen 1.5B")).join(", ")}.`}{" "}
                        Aucun autre modèle n’est téléchargé automatiquement.
                        Libérer la mémoire conserve les fichiers ; effacer les
                        données du site peut les supprimer.
                      </p>
                      <label>
                        Mode
                        <select
                          value={modelMode}
                          disabled={
                            modelState === "loading" ||
                            modelState === "ready" ||
                            busy
                          }
                          onChange={(e) => {
                            const mode = e.target.value as ModelMode;
                            setModelMode(mode);
                            try {
                              localStorage.setItem("gc.modelMode", mode);
                            } catch {
                              /* Optional preference. */
                            }
                          }}
                        >
                          <option value="light">
                            Léger · environ 400 Mo · réponses simples
                          </option>
                          <option value="balanced">
                            Conversation · environ 900 Mo
                          </option>
                        </select>
                      </label>
                      <small>
                        Prévoir environ{" "}
                        {modelMode === "light" ? "1,5 Go" : "2 Go"} de mémoire
                        graphique libre. Chrome ou Edge compatible WebGPU
                        recommandé. Le calcul mobilise votre GPU : évitez de le
                        lancer en pleine partie.
                      </small>
                      {modelState === "loading" ? (
                        <>
                          <div className="model-progress" role="status">
                            <progress value={modelProgress} max={100} />{" "}
                            Chargement : {modelProgress} %
                          </div>
                          <button
                            className="secondary"
                            onClick={() => {
                              modelCancelRequested.current = true;
                              localAgent.current?.cancelLocalModelLoad();
                            }}
                          >
                            Arrêter le chargement
                          </button>
                        </>
                      ) : modelState === "ready" ? (
                        <div className="model-ready">
                          <span className="pill">
                            Prêt ·{" "}
                            {modelMode === "light" ? "Qwen3 0.6B" : "Qwen 1.5B"}
                          </span>
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() => void releaseModel()}
                          >
                            Libérer la mémoire
                          </button>
                        </div>
                      ) : (
                        <button
                          className="primary"
                          disabled={busy || !cacheChecked}
                          onClick={() => void initializeModel()}
                        >
                          {pendingQuestion
                            ? modelCached
                              ? "Réutiliser et répondre"
                              : `Télécharger et répondre (${modelMode === "light" ? "~400 Mo" : "~900 Mo"})`
                            : modelState === "error"
                              ? "Réessayer le chargement"
                              : modelAction}
                        </button>
                      )}
                      <small>
                        Modèles Qwen · licence Apache 2.0.{" "}
                        <a
                          href="https://huggingface.co/Qwen/Qwen3-0.6B"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Voir le modèle
                        </a>
                        . Sans connexion, les échanges restent sur cet appareil
                        ; connecté, l’historique est synchronisé dans votre
                        compte.
                      </small>
                    </div>
                    <div className="messages" aria-live="polite" ref={messagesView}>
                      {!messages.length ? (
                        <div className="chat-empty">
                          <MessageSquare size={38} />
                          <h2>Qu’est-ce que vous voulez vérifier ?</h2>
                          <p>Votre fiche matériel sert de point de départ.</p>
                          <div className="suggestions">
                            {[
                              "Analyse ma configuration",
                              "Quel upgrade est pertinent pour ma configuration en 1440p ?",
                              "Optimise les réglages pour ma configuration",
                            ].map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  setPrompt(s);
                                  setPendingQuestion("");
                                  setAssistantError("");
                                }}
                              >
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
                            <p>
                              {m.role === "assistant" ? (
                                <AssistantText
                                  text={cleanModelReply(m.content)}
                                />
                              ) : (
                                m.content
                              )}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    {pendingQuestion && (
                      <div className="pending-assistant" aria-live="polite">
                        <div className="message user">
                          <small>Vous</small>
                          <p>{pendingQuestion}</p>
                        </div>
                        {assistantError ? (
                          <div className="message assistant" role="alert">
                            <small>Copilot · réponse interrompue</small>
                            <p>{assistantError}</p>
                            <p>
                              Votre question est conservée. Vous pouvez
                              réessayer ou utiliser l’analyse de configuration
                              sans modèle.
                            </p>
                          </div>
                        ) : (
                          !busy &&
                          modelState !== "ready" && (
                            <div className="message assistant">
                              <small>Copilot</small>
                              {modelState === "loading" ? (
                                <>
                                  <p>
                                    Chargement du modèle sur cet appareil :{" "}
                                    {modelProgress} %. La réponse démarrera
                                    automatiquement.
                                  </p>
                                  <progress
                                    value={modelProgress}
                                    max={100}
                                    aria-label="Chargement du modèle"
                                  />
                                  <button
                                    className="secondary"
                                    onClick={() => {
                                      modelCancelRequested.current = true;
                                      localAgent.current?.cancelLocalModelLoad();
                                    }}
                                  >
                                    Arrêter le chargement
                                  </button>
                                </>
                              ) : (
                                <>
                                  <p>
                                    Pour répondre à cette question, activez le
                                    modèle gratuit sur votre appareil.{" "}
                                    {modelMode === "light"
                                      ? "Environ 400 Mo et 1,5 Go de mémoire graphique"
                                      : "Environ 900 Mo et 2 Go de mémoire graphique"}{" "}
                                    ; Chrome ou Edge compatible WebGPU requis.
                                    Aucun téléchargement avant votre clic.
                                  </p>
                                  <button
                                    className="primary"
                                    onClick={() => void initializeModel()}
                                  >
                                    {modelCached
                                      ? "Réutiliser et répondre"
                                      : modelAction}
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {busy && (
                      <div className="message assistant" role="status">
                        <small>Copilot · en cours</small>
                        <p>{liveReply || "Préparation de la réponse…"}</p>
                        <button
                          className="text-button"
                          onClick={() => localAgent.current?.stopLocalReply()}
                        >
                          Arrêter la réponse
                        </button>
                      </div>
                    )}
                    <div ref={chatEnd} />
                    <form className="composer" onSubmit={ask}>
                      <input
                        aria-label="Votre question"
                        maxLength={2000}
                        placeholder="Demandez quelque chose à votre copilote…"
                        value={prompt}
                        disabled={busy || modelState === "loading"}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                          setPendingQuestion("");
                          setAssistantError("");
                        }}
                      />
                      <button
                        className="primary"
                        disabled={
                          busy || !prompt.trim() || modelState === "loading"
                        }
                        aria-label={
                          pendingQuestion && !busy && modelState !== "ready"
                            ? modelCached
                              ? "Réutiliser et répondre"
                              : `Télécharger et répondre (${modelMode === "light" ? "~400 Mo" : "~900 Mo"})`
                            : "Envoyer"
                        }
                      >
                        {pendingQuestion && !busy && modelState !== "ready" ? (
                          modelCached ? (
                            "Réutiliser et répondre"
                          ) : (
                            `Télécharger et répondre (${modelMode === "light" ? "~400 Mo" : "~900 Mo"})`
                          )
                        ) : (
                          <Send size={18} />
                        )}
                      </button>
                    </form>
                    <small className="chat-note">
                      Le mode Conversation est conseillé pour suivre un échange.
                      Le mode léger reste limité et les deux peuvent se tromper.
                      Vérifiez les conseils sur les fiches constructeur. Aucun
                      FPS mesuré n’est déduit du matériel.
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
                  <PriceSearch
                    initialQuery={priceQuery}
                    target={priceTarget}
                    activation={priceActivation}
                    savedReferences={savedReferences}
                    onSelect={(query) => {
                      try {
                        const refs = keepReference(savedReferences, query);
                        localStorage.setItem(
                          referenceKey,
                          JSON.stringify(refs),
                        );
                        setSavedReferences(refs);
                        setComponent(query.slice(0, 150));
                        setNotice(
                          "Référence enregistrée dans votre liste sur cet appareil. Vous pouvez la comparer à nouveau ou définir un budget maximum.",
                        );
                      } catch {
                        setNotice(
                          "Impossible de garder la référence : le stockage de ce navigateur est indisponible.",
                        );
                      }
                    }}
                  />
                  <section className="panel">
                    <h3>Références gardées sur cet appareil</h3>
                    <p>
                      Conservées après rechargement dans ce navigateur,
                      séparément pour chaque compte. Elles ne sont pas
                      synchronisées entre appareils.
                    </p>
                    {savedReferences.length ? (
                      savedReferences.map((ref) => (
                        <div className="alert-row" key={ref}>
                          <strong>{ref}</strong>
                          <button
                            className="secondary"
                            onClick={() => {
                              setPriceQuery(ref);
                              setPriceTarget(undefined);
                              setPriceActivation((v) => v + 1);
                            }}
                          >
                            Comparer cette référence
                          </button>
                          <button
                            aria-label={`Retirer la référence ${ref}`}
                            onClick={() => {
                              try {
                                const next = savedReferences.filter(
                                  (r) => r !== ref,
                                );
                                localStorage.setItem(
                                  referenceKey,
                                  JSON.stringify(next),
                                );
                                setSavedReferences(next);
                              } catch {
                                setNotice(
                                  "La référence n’a pas pu être retirée.",
                                );
                              }
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                          <button
                            className="text-button"
                            onClick={() => {
                              setComponent(ref);
                              document
                                .getElementById("price-threshold-form")
                                ?.scrollIntoView({ behavior: "smooth" });
                            }}
                          >
                            Définir un seuil
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>
                        Aucune référence gardée pour le moment. Le bouton «
                        Garder cette référence » enregistre réellement votre
                        sélection ici.
                      </p>
                    )}
                  </section>
                  <div className="provider-banner">
                    <ShieldCheck />
                    <div>
                      <strong>Vérifiez vos prix à la demande.</strong>
                      <p>
                        « Appliquer ce seuil et comparer » lance la recherche et
                        masque les offres au-dessus du maximum. Le budget
                        s’applique au prix du produit, hors livraison. Aucune
                        surveillance en arrière-plan ni notification automatique
                        n’est activée.
                      </p>
                    </div>
                    <span className="pill">Recherche active</span>
                  </div>
                  <div className="config-layout">
                    <form
                      id="price-threshold-form"
                      className="panel config-form"
                      onSubmit={addAlert}
                    >
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
                        Budget maximum (€), hors livraison
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
                              <small>Vérification à la demande</small>
                              <button
                                className="text-button"
                                onClick={() => {
                                  setPriceQuery(a.component);
                                  setPriceTarget(a.target);
                                  setPriceActivation((v) => v + 1);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                              >
                                Appliquer ce seuil et comparer
                              </button>
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
