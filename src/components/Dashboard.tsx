import {
  Cpu,
  Monitor,
  Bell,
  ArrowUpRight,
  ScanLine,
  MessageSquare,
  HardDrive,
  CircuitBoard,
  MemoryStick,
  Plug,
} from "lucide-react";
import type { PcConfig } from "../domain";
type Props = {
  config: PcConfig;
  alertsCount: number;
  openConfig: () => void;
  openAssistant: () => void;
  openPrices: () => void;
};
const rows = [
  { key: "cpu", label: "Processeur", icon: Cpu },
  { key: "gpu", label: "Carte graphique", icon: Monitor },
  { key: "motherboard", label: "Carte mère", icon: CircuitBoard },
  { key: "ram", label: "Mémoire", icon: MemoryStick },
  { key: "storage", label: "Stockage", icon: HardDrive },
  { key: "psu", label: "Alimentation", icon: Plug },
] as const;
function SetupGraphic() {
  return (
    <svg
      className="setup-graphic"
      viewBox="0 0 400 280"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="220" cy="138" r="110" stroke="#9BAEFF" strokeWidth="1" />
      <path
        d="M52 79h36M70 61v36M342 214h30M357 199v30"
        stroke="#CEEF91"
        strokeWidth="3"
      />
      <g transform="rotate(-8 220 138)">
        <rect
          x="117"
          y="35"
          width="203"
          height="204"
          rx="18"
          fill="#161B36"
          stroke="#ACC0FF"
          strokeWidth="2"
        />
        <path
          d="M139 62h35v26h24M140 205h42v-24h17M295 69h-39v19h-13M295 208h-40v-23h-14"
          stroke="#8C9BC6"
          strokeWidth="3"
        />
        <rect x="177" y="94" width="89" height="89" rx="12" fill="#C9F48A" />
        <rect
          x="190"
          y="107"
          width="63"
          height="63"
          rx="5"
          stroke="#263D20"
          strokeWidth="2"
        />
        <path
          d="M201 126h40M201 136h27M201 146h34"
          stroke="#263D20"
          strokeWidth="3"
        />
        <path
          d="M194 83v-12M212 83v-12M230 83v-12M248 83v-12M194 194v12M212 194v12M230 194v12M248 194v12M166 112h-12M166 130h-12M166 148h-12M166 166h-12M277 112h12M277 130h12M277 148h12M277 166h12"
          stroke="#C9F48A"
          strokeWidth="4"
        />
        <circle cx="142" cy="83" r="5" fill="#FFA89E" />
        <circle cx="295" cy="190" r="5" fill="#FFA89E" />
      </g>
      <g transform="rotate(7 96 189)">
        <rect x="30" y="163" width="124" height="60" rx="10" fill="#FFA89E" />
        <path d="M50 183h84M50 198h54" stroke="#632E33" strokeWidth="3" />
        <path
          d="M52 228v8M70 228v8M88 228v8M106 228v8M124 228v8"
          stroke="#FFA89E"
          strokeWidth="4"
        />
      </g>
      <circle cx="340" cy="75" r="7" fill="#C9F48A" />
    </svg>
  );
}
export default function Dashboard({
  config,
  alertsCount,
  openConfig,
  openAssistant,
  openPrices,
}: Props) {
  const filled = rows.filter((row) => config[row.key]).length;
  return (
    <div className="dashboard-flow">
      <section className="scan-launch">
        <div className="scan-copy">
          <span className="scan-label">
            <ScanLine size={16} /> Faites connaissance avec votre PC
          </span>
          <h2>
            Moins de saisie.
            <br />
            Plus de jeu.
          </h2>
          <p>
            Identifiez vos composants depuis Windows ou importez votre rapport
            matériel.
          </p>
          <button className="primary" onClick={openConfig}>
            Identifier mon matériel <ArrowUpRight size={18} />
          </button>
          <span className="scan-footnote">
            Vous pouvez aussi remplir votre fiche à la main.
          </span>
        </div>
        <SetupGraphic />
      </section>
      <div className="overview-grid">
        <section className="rig-panel">
          <div className="rig-heading">
            <div>
              <span className="kicker">VOTRE CONFIGURATION</span>
              <h2>{config.name}</h2>
            </div>
            <span className="inventory-count">
              {filled}
              <span>/6 identifiés</span>
            </span>
          </div>
          <div className="inventory-rows">
            {rows.map(({ key, label, icon: Icon }) => (
              <div className={"inventory-row component-" + key} key={key}>
                <span className="component-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <small>{label}</small>
                  <strong className={config[key] ? "" : "unfilled"}>
                    {config[key] || "À identifier"}
                  </strong>
                </div>
                <span
                  className={"component-status " + (config[key] ? "known" : "")}
                />
              </div>
            ))}
          </div>
          <div className="rig-bottom">
            <span>
              {filled
                ? "Votre inventaire enregistré"
                : "Votre première fiche vous attend"}
            </span>
            <button className="text-link" onClick={openConfig}>
              Voir ma config <ArrowUpRight size={16} />
            </button>
          </div>
        </section>
        <div className="overview-right">
          <section className="objective-panel">
            <div className="section-title">
              <h3>Le jeu, à votre façon.</h3>
              <Monitor size={20} />
            </div>
            <div className="objective-values">
              <span>
                {config.resolution}
                <small>Résolution cible</small>
              </span>
              <span>
                {config.targetFps}
                <small>Objectif FPS</small>
              </span>
            </div>
            <div className="objective-bottom">
              <p>Vos objectifs, pas des performances mesurées.</p>
              <button
                className="text-link"
                onClick={openConfig}
                aria-label="Ajuster les objectifs"
              >
                <ArrowUpRight size={20} />
              </button>
            </div>
          </section>
          <section className="queue-panel">
            <button onClick={openAssistant}>
              <span className="queue-icon">
                <MessageSquare size={19} />
              </span>
              <div>
                <strong>On parle de votre setup ?</strong>
                <small>Compatibilité, réglages, upgrades</small>
              </div>
              <ArrowUpRight size={18} />
            </button>
            <button onClick={openPrices}>
              <span className="queue-icon">
                <Bell size={19} />
              </span>
              <div>
                <strong>
                  {alertsCount
                    ? alertsCount + " seuil(s) enregistré(s)"
                    : "Votre prochain achat"}
                </strong>
                <small>Comparer les offres marchandes</small>
              </div>
              <ArrowUpRight size={18} />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
