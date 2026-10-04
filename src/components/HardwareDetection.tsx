import { useRef, useState } from "react";
import {
  ScanLine,
  Upload,
  Download,
  Check,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { fields, type PcConfig } from "../domain";
import {
  hardwareReportSchema,
  readHardwareFile,
  type HardwareReport,
} from "../hardware";

type Props = { onApply: (report: HardwareReport) => void; config: PcConfig };
const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
export default function HardwareDetection({ onApply, config }: Props) {
  const [report, setReport] = useState<HardwareReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function detect() {
    setBusy(true);
    setError("");
    setApplied(false);
    setReport(null);
    try {
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
      setReport(hardwareReportSchema.parse(data));
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
      setReport(await readHardwareFile(file));
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
              ? "Lisez les composants depuis Windows, puis vérifiez le résultat."
              : "Importez un inventaire Windows pour remplir votre configuration sans tout recopier."}
          </p>
        </div>
        <span className="platform-tag">WINDOWS</span>
      </div>
      <div className="detection-controls">
        {local && (
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
        )}
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
      </div>
      <p className="detection-privacy">
        Lecture seule. Aucun numéro de série collecté. Rien n’est enregistré
        dans votre compte avant confirmation.
      </p>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
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
                        : "Non remonté par Windows")}
                    {value && old && value !== old && (
                      <small>Remplace : {old}</small>
                    )}
                  </dd>
                  <span className={value ? "detected-tag" : "unknown-tag"}>
                    {value ? "Lu par Windows" : "À vérifier"}
                  </span>
                </div>
              );
            })}
          </dl>
          {report.warnings.length > 1 && (
            <p className="scan-warning">
              {report.warnings.length - 1} remarque(s) de collecte : vérifiez
              les références, notamment si plusieurs GPU ou disques sont
              présents.
            </p>
          )}
          <div className="scan-bottom">
            <p>
              Les champs non détectés, votre nom de setup et vos objectifs sont
              conservés.
            </p>
            <button
              className="primary"
              disabled={busy || applied || count === 0}
              onClick={() => {
                onApply(report);
                setApplied(true);
              }}
            >
              <Check size={17} />
              {applied ? "Ajouté à la fiche" : "Utiliser ces composants"}
            </button>
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
