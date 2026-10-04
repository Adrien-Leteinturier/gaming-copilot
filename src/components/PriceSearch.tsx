import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, RefreshCw, ShieldCheck } from "lucide-react";
import {
  filterOffersByBudget,
  categories,
  categoryLabels,
  findPrices,
  guessCategory,
  searchLinks,
  type PriceCategory,
  type PriceResult,
} from "../prices";
const euros = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
export default function PriceSearch({
  initialQuery = "",
  target,
  onSelect,
  activation = 0,
  savedReferences = [],
}: {
  initialQuery?: string;
  target?: number;
  onSelect(query: string): void;
  activation?: number;
  savedReferences?: string[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<PriceCategory>(
    guessCategory(initialQuery),
  );
  const [result, setResult] = useState<PriceResult | null>(null);
  const [maxBudget, setMaxBudget] = useState(target?.toString() ?? "");
  const activeTarget =
    maxBudget.trim() && Number(maxBudget) > 0 ? Number(maxBudget) : undefined;
  const visibleOffers = filterOffersByBudget(
    result?.offers ?? [],
    activeTarget,
  );
  const hiddenCount = (result?.offers.length ?? 0) - visibleOffers.length;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    if (initialQuery) {
      request.current?.abort();
      setBusy(false);
      setQuery(initialQuery);
      setCategory(guessCategory(initialQuery));
      setResult(null);
      setMaxBudget(target?.toString() ?? "");
      if (activation > 0)
        void search(initialQuery, guessCategory(initialQuery));
    }
  }, [initialQuery, target, activation]);
  useEffect(() => () => request.current?.abort(), []);
  async function search(searchQuery = query, searchCategory = category) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await findPrices(
        searchQuery.trim(),
        searchCategory,
        controller.signal,
      );
      if (!controller.signal.aborted) setResult(data);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Recherche indisponible.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="panel price-search" aria-label="Comparateur de prix">
      <div className="section-title">
        <h2>
          <Search size={21} /> Comparer les offres
        </h2>
        <span>Sans compte partenaire</span>
      </div>
      <p className="muted">
        Prix lus sur les fiches LDLC, Materiel.net, Alternate et Cybertek. Pour
        Amazon, Cdiscount et les autres sites, ouvrez leur recherche ci-dessous.
      </p>
      <form
        className="price-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label>
          Référence à comparer
          <input
            required
            minLength={2}
            maxLength={150}
            value={query}
            placeholder="Ex. Ryzen 7 5700X ou RX 9060 XT 16GB"
            onChange={(e) => {
              request.current?.abort();
              setBusy(false);
              setQuery(e.target.value);
              setCategory(guessCategory(e.target.value));
              setResult(null);
            }}
          />
        </label>
        <label>
          Catégorie
          <select
            value={category}
            onChange={(e) => {
              request.current?.abort();
              setBusy(false);
              setCategory(e.target.value as PriceCategory);
              setResult(null);
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Budget maximum (€), hors livraison
          <input
            type="number"
            min="0.01"
            max="100000"
            step="0.01"
            value={maxBudget}
            placeholder="Sans limite"
            onChange={(e) => setMaxBudget(e.target.value)}
          />
        </label>
        <button className="primary" disabled={busy || query.trim().length < 2}>
          <Search size={17} />
          {busy ? "Lecture des offres…" : "Comparer"}
        </button>
      </form>
      <div className="price-budget-status" role="status">
        {activeTarget ? (
          <>
            <strong>
              Filtre actif : {euros(activeTarget)} maximum, hors livraison.
            </strong>
            <p>
              Seules les offres à ce prix ou moins sont affichées. Le tri est du
              moins cher au plus cher.
            </p>
            <button className="text-button" onClick={() => setMaxBudget("")}>
              Retirer le filtre de budget
            </button>
          </>
        ) : (
          <>
            <strong>Aucun filtre de budget.</strong>
            <p>Renseignez un maximum pour masquer les offres trop chères.</p>
          </>
        )}
      </div>
      {busy && (
        <p role="status">
          Consultation des catalogues et vérification des fiches produit…
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="price-results-heading">
            <strong>
              {visibleOffers.length} offre(s) affichée(s) sur{" "}
              {result.offers.length} vérifiée(s) pour « {result.query} »
            </strong>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void search()}
            >
              <RefreshCw size={14} /> Actualiser
            </button>
          </div>
          <p className="price-caveat">
            <ShieldCheck size={16} /> Prix croissants, hors livraison. Vérifiez
            la variante, le vendeur et le stock. Cette recherche couvre une
            partie des catalogues, pas tout le marché. LDLC et Materiel.net
            appartiennent au même groupe.
          </p>
          {activeTarget && (
            <p>
              {hiddenCount} offre(s) au-dessus de {euros(activeTarget)}{" "}
              masquée(s). Les frais de port ne sont pas inclus.
            </p>
          )}
          {!!result.offers.length && !visibleOffers.length && (
            <p role="status">
              Aucune offre à {activeTarget ? euros(activeTarget) : "ce budget"}{" "}
              ou moins dans les résultats vérifiés. Augmentez ou retirez le
              budget pour voir les autres offres.
            </p>
          )}
          {!result.offers.length && (
            <p>
              Aucune offre vérifiable dans les pages consultées. Essayez la
              référence précise ou les recherches externes. Cela ne signifie pas
              que le produit est indisponible.
            </p>
          )}
          <div className="price-offers">
            {visibleOffers.map((o, i) => (
              <article className="price-offer" key={`${o.url}:${o.seller}`}>
                <div>
                  <span className="offer-merchant">
                    {o.merchant}
                    {o.seller
                      ? ` · vendeur ${o.seller}`
                      : " · vendeur à vérifier"}
                  </span>
                  <h3>{o.component}</h3>
                  <small>
                    {o.condition === "new"
                      ? "Neuf"
                      : o.condition === "used"
                        ? "Occasion"
                        : o.condition === "refurbished"
                          ? "Reconditionné"
                          : "État à vérifier"}{" "}
                    ·{" "}
                    {o.availability === "in-stock"
                      ? "En stock lors du relevé"
                      : "Stock à vérifier"}
                  </small>
                  {o.mpn && <small>Référence fabricant : {o.mpn}</small>}
                  {o.gtin && <small>EAN : {o.gtin}</small>}
                  <small>
                    Lu le {new Date(o.observedAt).toLocaleString("fr-FR")} ·
                    livraison non incluse
                  </small>
                </div>
                <div className="offer-actions">
                  <strong>{euros(o.amount)}</strong>
                  {i === 0 && (
                    <small>Le plus bas parmi les offres affichées</small>
                  )}
                  {activeTarget && o.amount <= activeTarget! && (
                    <span className="pill">Sous votre seuil hors port</span>
                  )}
                  <a
                    className="primary"
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir l’offre <ArrowUpRight size={15} />
                  </a>
                  <button
                    className="text-button"
                    disabled={savedReferences.includes(
                      o.component.slice(0, 150),
                    )}
                    onClick={() => onSelect(o.component)}
                  >
                    {savedReferences.includes(o.component.slice(0, 150))
                      ? "Référence enregistrée sur cet appareil"
                      : "Garder cette référence"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="price-source-status">
            {result.sources.map((s) => (
              <div key={s.merchant}>
                <strong>
                  {s.merchant} ·{" "}
                  {s.status === "ok" ? `${s.count} offre(s)` : "Indisponible"}
                </strong>
                <small>{s.note}</small>
              </div>
            ))}
          </div>
        </>
      )}
      {query.trim().length >= 2 && (
        <div className="external-search">
          <h3>Élargir la recherche</h3>
          <p>
            Ces liens ouvrent les marchands et comparateurs. Leurs prix ne sont
            pas récupérés automatiquement ici.
          </p>
          <div>
            {searchLinks(query.trim()).map((s) => (
              <a
                className="secondary"
                key={s.merchant}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.merchant} <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
