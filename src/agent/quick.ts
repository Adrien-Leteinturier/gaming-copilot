import { componentAdvice } from "./component-advice";
import { adviceQuestion, buildSetupAdvice } from "./advice";
import type { Message, PcConfig } from "../domain";
import { priceQueryFrom, groundedDiagnostic } from "./context";
export async function quickReply(
  question: string,
  config: PcConfig,
  history: Message[] = [],
): Promise<string | null> {
  const adviceIntent = adviceQuestion(question, history);
  if (adviceIntent) {
    const specific = componentAdvice(adviceIntent, config);
    if (specific) return specific;
    const advice = buildSetupAdvice(adviceIntent, config);
    if (!advice.budget || !advice.candidates.length) return advice.text;
    const { findPrices } = await import("../prices");
    const results = await Promise.allSettled(
      advice.candidates.map((query) => findPrices(query)),
    );
    const prices = results.map((result, i) => {
      if (result.status === "rejected")
        return `${advice.candidates[i]} : recherche indisponible, aucun prix inventé.`;
      const cheapest = result.value.offers
        .filter((o) => /(?:9070\s*XT|5070\s*Ti)/i.test(o.component))
        .sort((a, b) => a.amount - b.amount)[0];
      if (!cheapest)
        return `${advice.candidates[i]} : aucune offre vérifiable dans les sources consultées.`;
      return `${advice.candidates[i]} : ${cheapest.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} hors livraison chez ${cheapest.merchant} — ${cheapest.amount <= advice.budget! ? "dans le budget annoncé hors frais supplémentaires" : "au-dessus du budget annoncé"}. Offre : ${cheapest.url} (relevée le ${new Date(cheapest.observedAt).toLocaleString("fr-FR")}).`;
    });
    return (
      advice.text +
      "\n\nOffres vérifiées à cet instant (couverture partielle) :\n" +
      prices.join("\n")
    );
  }
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
  const diagnostic = groundedDiagnostic(question, config);
  if (diagnostic) return diagnostic;
  if (/r[oô]le|sert|fonction|qu.est.ce|c.est quoi|explique/i.test(question)) {
    if (/\bRAM\b|m[eé]moire vive/i.test(question))
      return "La RAM est la mémoire de travail temporaire du PC. Elle contient les données et programmes en cours d’utilisation pour que le processeur y accède rapidement. Son contenu disparaît lorsque le PC s’éteint ; les fichiers conservés restent sur le SSD ou le disque. Un manque de RAM peut provoquer des ralentissements, mais en ajouter ne garantit pas davantage de FPS.";
    if (/processeur|\bCPU\b/i.test(question))
      return "Le processeur (CPU) exécute les instructions des programmes. Dans un jeu, il traite notamment la logique, la physique et les actions des personnages, puis prépare du travail pour la carte graphique. Le GPU calcule l’image affichée. La fluidité dépend de l’ensemble du PC et du jeu : le nom du CPU seul ne permet pas de prédire les FPS.";
    if (/carte graphique|\bGPU\b/i.test(question))
      return "La carte graphique (GPU) calcule les images du jeu : géométrie, textures, éclairage et effets. Une résolution ou une qualité visuelle plus élevée peut demander davantage de travail au GPU. Le processeur, la mémoire et le jeu influencent aussi la fluidité ; aucune performance mesurée ne peut être déduite du nom de la carte seul.";
  }
  return null;
}
