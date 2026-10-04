import type { Message, PcConfig } from "../domain";

// Source-backed specifications, checked 2026-10-04. No performance ranking or FPS estimates.
export const upgradeCatalog = [
  {
    name: "Radeon RX 9070 XT",
    query: "RX 9070 XT",
    memory: "16 Go GDDR6",
    psu: 750,
    source:
      "https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9070xt.html",
  },
  {
    name: "GeForce RTX 5070 Ti",
    query: "RTX 5070 Ti",
    memory: "16 Go GDDR7",
    psu: 750,
    source:
      "https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/",
  },
] as const;
export function isAdviceQuestion(question: string) {
  return /optimal|optimis|que.*penses|avis.*(?:config|setup)|conseil|recommand|meilleur|am[eé]lior|upgrade|quel.*(?:matos|mat[eé]riel|composant|carte graphique)|r[eé]gl.*(?:jeu|1440|1080|4k)/i.test(
    question,
  );
}
export function adviceQuestion(question: string, history: Message[] = []) {
  if (isAdviceQuestion(question)) return question;
  if (
    question.length < 350 &&
    /budget|euros?|€|\b(?:1440p|1080p|4k|\d+\s*fps)\b|je joue|cyberpunk|fortnite|warzone|valorant/i.test(
      question,
    )
  ) {
    const recent = history.slice(-8);
    const index = recent
      .map((m) => m.role === "user" && isAdviceQuestion(m.content))
      .lastIndexOf(true);
    if (index >= 0)
      return (
        recent
          .slice(index)
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join("\n")
          .slice(-3000) +
        "\nPrécision actuelle : " +
        question
      );
  }
  return null;
}
export function buildSetupAdvice(question: string, config: PcConfig) {
  const resolution = /1440|\bqhd\b/i.test(question)
    ? "1440p"
    : /2160|\b4k\b/i.test(question)
      ? "4K"
      : /1080|full.?hd/i.test(question)
        ? "1080p"
        : config.resolution;
  const budget = Array.from(
    question.matchAll(
      /(?:budget[^\d]{0,20})?(\d{2,5})(?:[,.]\d{1,2})?\s*(?:€|euros?)/gi,
    ),
  ).at(-1)?.[1];
  const ram = Number(
    config.ram
      .match(/(\d+(?:[.,]\d+)?)\s*(?:GiB|GB|Go)\b/i)?.[1]
      ?.replace(",", "."),
  );
  const gpu9060 = /RX\s*9060\s*XT/i.test(config.gpu);
  const alreadyCandidate =
    /RX\s*(?:9070|7900)|RTX\s*(?:5070\s*Ti|5080|5090|4090|4080)/i.test(
      config.gpu,
    );
  const lines = [
    `Pour votre setup « ${config.name} » en ${resolution}, je pars de votre matériel enregistré :`,
    `CPU : ${config.cpu || "inconnu"}\nGPU : ${config.gpu || "inconnu"}\nRAM : ${config.ram || "inconnue"}\nCarte mère : ${config.motherboard || "inconnue"}.`,
  ];
  if (!config.cpu || !config.gpu) {
    lines.push(
      "Le processeur ou le GPU manque : je ne peux pas conseiller un remplacement pertinent. Lancez le collecteur Windows dans Ma Config ou complétez les références.",
    );
    return {
      text: lines.join("\n\n"),
      candidates: [] as string[],
      budget: budget ? Number(budget) : null,
    };
  }
  lines.push("À conserver en premier :");
  lines.push(
    `• CPU ${config.cpu} : je ne conseille pas de le remplacer sans constater une limite CPU dans vos jeux. Un CPU plus récent n’est pas automatiquement compatible avec votre carte mère.`,
  );
  lines.push(
    Number.isFinite(ram) && ram >= 32
      ? `• Vos ${config.ram} : augmenter la capacité n’est pas ma première piste d’upgrade, sauf saturation constatée ou besoin applicatif particulier.`
      : Number.isFinite(ram) && ram < 16
        ? `• Vos ${config.ram} : vérifiez en priorité si la mémoire sature et les exigences de vos jeux. Un kit doit être choisi selon la génération et la liste de support de votre carte mère.`
        : `• RAM ${config.ram || "inconnue"} : vérifier la capacité utilisée en jeu avant d’en acheter davantage.`,
  );
  if (config.storage)
    lines.push(
      `• Stockage ${config.storage} : ne pas remplacer un disque pour promettre des FPS ; vérifier l’espace libre et installer les jeux sur un SSD disponible.`,
    );
  if (gpu9060 && resolution === "1440p") {
    lines.push(
      "Votre RX 9060 XT est une carte que le constructeur destine au 1440p. Je commencerais donc par la conserver et tester vos jeux, plutôt que vous faire acheter immédiatement un autre GPU. Confirmez sa variante 8 ou 16 Go, que le collecteur ne fournit pas toujours. Source AMD : https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9060xt.html",
    );
  }
  lines.push(
    `Réglages de départ : utilisez ${resolution} si votre écran le permet, sans ray tracing, avec un préréglage moyen ou élevé à tester. Réduisez les ombres/effets en cas de manque de fluidité et les textures si la VRAM sature. Comparez les mêmes scènes ; aucun FPS n’est garanti par cette fiche.`,
  );
  const candidates =
    resolution === "1440p" && !alreadyCandidate
      ? upgradeCatalog.map((c) => c.query)
      : [];
  if (candidates.length) {
    lines.push(
      "Si vos mesures montrent que le GPU limite réellement votre objectif, deux références à comparer pour un éventuel remplacement (pas un classement universel) :",
    );
    for (const c of upgradeCatalog)
      lines.push(
        `• ${c.name} : ${c.memory}, alimentation système de ${c.psu} W indiquée par le constructeur. Référence partenaire, dimensions et connecteurs à vérifier. Source : ${c.source}`,
      );
  } else
    lines.push(
      "Je ne propose pas automatiquement un GPU de remplacement : le budget, les jeux et une mesure de votre limite sont nécessaires pour sélectionner une référence adaptée.",
    );
  lines.push(
    config.psu
      ? `Avant achat : alimentation déclarée ${config.psu}. Confirmez le modèle exact, les connecteurs et le boîtier ; je n’ai pas de validation de compatibilité.`
      : "Point bloquant avant achat : votre alimentation n’est pas renseignée. Il faut son modèle et sa puissance, ainsi que la place disponible dans le boîtier, avant de valider un nouveau GPU.",
  );
  if (/B550\s*GAMING\s*X\s*V2/i.test(config.motherboard))
    lines.push(
      "Votre B550 GAMING X V2 utilise de la DDR4 : la DDR5 ne se monte pas dessus. Vérifiez la révision de la carte et sa liste CPU/BIOS avant tout changement de processeur. Fiche GIGABYTE : https://www.gigabyte.com/Motherboard/B550-GAMING-X-V2-rev-14/sp (choisir votre révision).",
    );
  lines.push(
    budget
      ? `Budget annoncé : ${budget} €. Je peux relever les offres des références ci-dessus ; le prix hors livraison ne suffit pas à garantir le meilleur choix ou la compatibilité.`
      : "Pour choisir précisément le meilleur achat pour vous : quels jeux, quelle fluidité souhaitée et quel budget maximum ?",
  );
  return {
    text: lines.join("\n\n"),
    candidates,
    budget: budget ? Number(budget) : null,
  };
}
