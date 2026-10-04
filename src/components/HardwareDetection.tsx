import { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  Upload,
  Download,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { fields, type PcConfig } from "../domain";
import {
  detectBrowserHardware,
  hardwareReportSchema,
  readHardwareFile,
  type HardwareReport,
} from "../hardware";

type Props = {
  onApply: (report: HardwareReport) => Promise<void>;
  config: PcConfig;
  autoStart?: boolean;
};
const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
export default function HardwareDetection({
  onApply,
  config,
  autoStart,
}: Props) {
  const [report, setReport] = useState<HardwareReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      void detect();
    }
  }, [autoStart]);
  async function detect() {
    setBusy(true);
    setError("");
    setApplied(false);
    setReport(null);
    try {
      if (!local) {
        const detected = await detectBrowserHardware();
        setReport(detected);
        await onApply(detected);
        setApplied(true);
        return;
      }
      const response = await fetch("/api/hardware", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.headers.get("Content-Type")?.includes("application/json"))
        throw new Error(
          "Le collecteur local n’est pas actif. Importez un rapport Windows pour continuer.",
        );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Détection indisponible.");
      const detected = hardwareReportSchema.parse(data);
      setReport(detected);
      await onApply(detected);
      setApplied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Détection indisponible.");
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setApplied(false);
    setReport(null);
    try {
      const detected = await readHardwareFile(file);
      setReport(detected);
      await onApply(detected);
      setApplied(true);
    } catch {
      setError(
        "Rapport invalide. Importez le fichier JSON généré par le collecteur Gaming Copilot (64 Ko maximum).",
      );
    }
    if (input.current) input.current.value = "";
  }
  const count = report
    ? Object.values(report.components).filter(Boolean).length
    : 0;
  return (
    <section className="detection-panel" aria-labelledby="detection-title">
      <div className="detection-intro">
        <span className="tool-marker">
          <ScanLine size={22} />
        </span>
        <div>
          <span className="kicker">01 / INVENTAIRE</span>
          <h2 id="detection-title">Détection du matériel</h2>
          <p>
            {local
              ? "Un clic pour identifier et enregistrer les composants accessibles depuis Windows."
              : "Un clic pour lire les informations accessibles au navigateur et remplir votre fiche."}
          </p>
        </div>
        <span className="platform-tag">{local ? "WINDOWS" : "NAVIGATEUR"}</span>
      </div>
      <div className="detection-controls">
        {
          <button className="primary" disabled={busy} onClick={detect}>
            {busy ? (
              <LoaderCircle className="spinning" size={17} />
            ) : report ? (
              <RotateCcw size={17} />
            ) : (
              <ScanLine size={17} />
            )}{" "}
            {busy
              ? "Lecture du matériel…"
              : report
                ? "Relancer la détection"
                : "Détecter ce PC"}
          </button>
        }
        <details className="collector-help">
          <summary>Compléter l’inventaire Windows</summary>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Upload size={16} />
            Importer un rapport
          </button>
          <a className="text-link" href="/detect-hardware.ps1" download>
            <Download size={15} />
            Collecteur Windows
          </a>
          <input
            className="visually-hidden"
            ref={input}
            type="file"
            accept=".json,application/json"
            aria-label="Rapport matériel Windows"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </details>
      </div>
      <details>
        <summary>Compléter avec un rapport Windows</summary>
        <p className="detection-privacy">
          Lecture seule. Aucun numéro de série collecté. La détection remplit et
          enregistre votre fiche dans votre espace ; vous pouvez ensuite la
          corriger.
        </p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </details>
      {report && (
        <div className="scan-result">
          <div className="section-title">
            <h3>{count} catégories détectées</h3>
            <span>
              Relevé du {new Date(report.detectedAt).toLocaleString("fr-FR")}
            </span>
          </div>
          <dl className="scan-list">
            {Object.entries(fields).map(([key, label]) => {
              const value =
                report.components[key as keyof HardwareReport["components"]];
              const old = config[key as keyof typeof fields];
              return (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {value ??
                      (key === "psu"
                        ? "À compléter : non accessible depuis Windows"
                        : "Non accessible à cette détection")}
                    {value && old && value !== old && (
                      <small>Remplace : {old}</small>
                    )}
                  </dd>
                  <span className={value ? "detected-tag" : "unknown-tag"}>
                    {value
                      ? report.platform === "windows"
                        ? "Lu par Windows"
                        : "GPU du navigateur"
                      : "À vérifier"}
                  </span>
                </div>
              );
            })}
          </dl>
          {report.warnings.length > 0 && (
            <p className="scan-warning">{report.warnings.join(" ")}</p>
          )}
          <div className="scan-bottom">
            <p>
              Les composants non accessibles et le nom du setup sont conservés.
              Le profil de départ est recalculé automatiquement.
            </p>
            <span>
              {applied
                ? "Fiche mise à jour automatiquement"
                : "Enregistrement non effectué : relancez la détection"}
            </span>
          </div>
        </div>
      )}
      <details className="collector-help">
        <summary>
          Utiliser le collecteur sur un autre PC ou depuis la version web
        </summary>
        <ol>
          <li>
            Téléchargez le collecteur Windows et placez-le dans un dossier de
            votre choix.
          </li>
          <li>
            Dans PowerShell ouvert sur ce dossier, lancez{" "}
            <code>
              powershell -NoProfile -File .\detect-hardware.ps1 -OutputPath
              .\gaming-copilot-hardware.json
            </code>
            .
          </li>
          <li>
            Importez le fichier <code>gaming-copilot-hardware.json</code> ici,
            vérifiez les composants puis enregistrez votre fiche.
          </li>
        </ol>
        <p>
          Windows peut appliquer une politique d’exécution aux scripts. Si le
          lancement est bloqué, gardez la saisie manuelle ; aucune protection
          n’est modifiée par l’application.
        </p>
      </details>
    </section>
  );
}
