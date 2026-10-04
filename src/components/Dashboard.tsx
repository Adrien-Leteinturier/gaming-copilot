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
export default function Dashboard({
  config,
  alertsCount,
  openConfig,
  openAssistant,
  openPrices,
}: Props) {
  const filled = rows.filter((row) => config[row.key]).length;
  return (
    <div className="overview-grid">
      <section className="rig-panel">
        <div className="rig-heading">
          <div>
            <span className="kicker">FICHE MATÉRIEL / 001</span>
            <h2>{config.name}</h2>
          </div>
          <span className="inventory-count">
            {filled}
            <span>/06</span>
          </span>
        </div>
        <div className="inventory-rows">
          {rows.map(({ key, label, icon: Icon }, index) => (
            <div className="inventory-row" key={key}>
              <span className="row-number">0{index + 1}</span>
              <Icon size={18} />
              <div>
                <small>{label}</small>
                <strong className={config[key] ? "" : "unfilled"}>
                  {config[key] || "Pas encore identifié"}
                </strong>
              </div>
              <span
                className={`component-status ${config[key] ? "known" : ""}`}
              />
            </div>
          ))}
        </div>
        <div className="rig-bottom">
          <span>
            {filled
              ? "Inventaire enregistré · aucune mesure de performance"
              : "Aucun inventaire enregistré"}
          </span>
          <button className="text-link" onClick={openConfig}>
            Ouvrir la fiche <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
      <div className="overview-right">
        <section className="scan-launch">
          <span className="kicker">COMMENCER ICI</span>
          <ScanLine className="scan-decoration" size={72} />
          <h2>
            Votre matériel,
            <br />
            sans le recopier.
          </h2>
          <p>
            Détectez les composants de ce PC ou importez son rapport Windows.
          </p>
          <button className="primary" onClick={openConfig}>
            <ScanLine size={17} />
            Identifier mon matériel
          </button>
          <span className="scan-footnote">
            Saisie manuelle toujours disponible
          </span>
        </section>
        <section className="objective-panel">
          <div className="section-title">
            <h3>Votre terrain de jeu</h3>
            <Monitor size={17} />
          </div>
          <div className="objective-values">
            <span>
              {config.resolution}
              <small>RÉSOLUTION CIBLE</small>
            </span>
            <span>
              {config.targetFps}
              <small>FPS SOUHAITÉS</small>
            </span>
          </div>
          <p>Vos objectifs, à comparer à des mesures en jeu.</p>
          <button className="text-link" onClick={openConfig}>
            Ajuster les objectifs <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="queue-panel">
          <button onClick={openAssistant}>
            <MessageSquare size={18} />
            <div>
              <strong>Un avis sur votre setup ?</strong>
              <small>Ouvrir une conversation</small>
            </div>
            <ArrowUpRight size={16} />
          </button>
          <button onClick={openPrices}>
            <Bell size={18} />
            <div>
              <strong>
                {alertsCount
                  ? `${alertsCount} seuil(s) de prix enregistré(s)`
                  : "Préparer un achat"}
              </strong>
              <small>Sources marchandes à connecter</small>
            </div>
            <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}
