import type { PcConfig } from "../domain";
import { priceQueryFrom, groundedDiagnostic } from "./context";
export async function quickReply(
  question: string,
  config: PcConfig,
): Promise<string | null> {
  if (/prix|co[uû]t|tarif|offres?/i.test(question)) {
    const query = priceQueryFrom(question, config);
    if (!query)
      return "Indiquez une référence précise (par exemple le modèle du processeur ou de la carte graphique), ou ouvrez la page Prix pour comparer les offres.";
    const { findPrices } = await import("../prices");
    const result = await findPrices(query);
    if (!result.offers.length)
      return `Aucun prix vérifiable pour ${query} dans les pages consultées. Élargissez la recherche dans la page Prix ; ce résultat ne signifie pas que le produit est indisponible.`;
    const lines = result.offers
      .slice(0, 4)
      .map(
        (o) =>
          `${o.merchant} : ${o.component} — ${o.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} hors livraison. Source : ${o.url} (lu le ${new Date(o.observedAt).toLocaleString("fr-FR")}).`,
      );
    return `Offres relevées pour ${query} :\n\n${lines.join("\n\n")}\n\nCouverture partielle. Vérifiez la variante, le vendeur et les frais de port ; la page Prix permet d’ouvrir les offres. Ces prix viennent des sources marchandes, pas du modèle.`;
  }
  return groundedDiagnostic(question, config);
}
