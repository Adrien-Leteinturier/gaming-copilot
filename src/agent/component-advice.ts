import type { PcConfig } from "../domain";

// Verified manufacturer specifications; no price or benchmark assumptions.
export function componentAdvice(
  question: string,
  config: PcConfig,
): string | null {
  if (/\bSSD\b|NVMe|stockage|disque/i.test(question)) {
    const capacity = question.match(/\b([124])\s*(?:To|TB)\b/i)?.[1];
    const budget = question.match(
      /(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:€|euros?)/i,
    )?.[1];
    const size = capacity
      ? `${capacity} To`
      : "2 To si vous manquez de place pour vos jeux, ou 1 To pour un besoin plus limité";
    const board = /B550\s*GAMING\s*X\s*V2/i.test(config.motherboard);
    return [
      `Pour un SSD destiné à vos jeux, je vous propose le Samsung 990 EVO Plus, en ${size}. C’est une référence NVMe au format M.2 2280 ; le choix final dépend du prix actuel et de la capacité dont vous avez besoin. Fiche constructeur : https://www.samsung.com/uk/memory-storage/nvme-ssd/990-evo-plus-2tb-nvme-pcie-gen-4-mz-v9s2t0bw/ (fiche de la variante 2 To).`,
      config.storage
        ? `Votre stockage actuel : ${config.storage}. Vous disposez déjà de SSD : cet achat se justifie si vous manquez de place ou remplacez un disque, sans promesse de gain de FPS.`
        : "Votre stockage actuel n’est pas renseigné : précisez s’il s’agit d’un ajout ou d’un remplacement.",
      board
        ? "Votre B550 GAMING X V2 dispose de connecteurs M.2, mais le collecteur ne confirme pas quel emplacement est libre. Vérifiez la révision de la carte, son manuel, le support du format 2280 et l’emplacement à utiliser avant l’achat. Fiche carte mère : https://www.gigabyte.com/Motherboard/B550-GAMING-X-V2-rev-14/sp"
        : `Compatibilité à vérifier : ${config.motherboard || "carte mère inconnue"}. Il faut un emplacement M.2 compatible NVMe au format 2280 disponible. Si vous avez seulement une baie SATA, il faudra choisir un SSD SATA 2,5 pouces à la place.`,
      budget
        ? `Votre plafond est de ${budget} €. Je ne confirme pas que cette référence y entre sans offre vérifiée. Comparez « Samsung 990 EVO Plus ${capacity || "2"} To » dans Prix avec ce maximum, hors livraison ; si aucune offre ne correspond, ne dépassez pas le budget par défaut.`
        : "Comparez cette référence dans Prix avant de décider : aucun tarif n’est déduit du nom du modèle.",
      `Pour affiner : ${capacity ? "" : "1 ou 2 To ? "}${budget ? "" : "Quel budget maximum ? "}Ajout ou remplacement, et avez-vous un emplacement M.2 libre ?`,
    ].join("\n\n");
  }
  if (
    /\bRAM\b|m[eé]moire vive|processeur|\bCPU\b|carte m[eè]re|alimentation|\bPSU\b/i.test(
      question,
    ) &&
    !/config|setup|optimal|ensemble/i.test(question)
  ) {
    if (/\bRAM\b|m[eé]moire vive/i.test(question))
      return `Pour la RAM, votre mémoire déclarée est ${config.ram || "inconnue"} et votre carte mère ${config.motherboard || "inconnue"}. Précisez la capacité souhaitée et votre budget : je dois vérifier la génération de mémoire, les emplacements libres et la liste de support avant de proposer un kit précis.`;
    if (/processeur|\bCPU\b/i.test(question))
      return `Pour le processeur, vous avez ${config.cpu || "une référence inconnue"} sur ${config.motherboard || "une carte mère inconnue"}. Quel budget et quel usage voulez-vous améliorer ? Le socket et la liste CPU/BIOS de la carte mère doivent être vérifiés avant de choisir un remplacement.`;
    return "Pour conseiller ce composant précisément, indiquez votre budget et s’il s’agit d’un remplacement ou d’un ajout. Il faut vérifier la référence et les exigences de compatibilité ; je ne vais pas détourner la demande vers une carte graphique.";
  }
  return null;
}
