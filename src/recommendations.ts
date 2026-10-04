import type { PcConfig } from "./domain";

// Editorial optimization rules; objectives are not predicted or measured FPS.
export function recommendProfile(config: PcConfig) {
  const gpu = config.gpu.toUpperCase();
  const known = /(?:RTX|GTX|RX)\s*\d{3,4}/.test(gpu);
  const comfortable =
    /RTX\s*(?:[345]0(?:70|80|90))|RX\s*(?:6[89]00|7[89]00|9060\s*XT|9070)/.test(
      gpu,
    );
  const integrated = /IRIS|UHD|INTEGRATED|INTÉGRÉ|RADEON GRAPHICS/.test(gpu);
  const ready = known || integrated;
  const ram = Number(
    config.ram
      .match(/(\d+(?:[.,]\d+)?)\s*(?:GiB|GB|Go)\b/i)?.[1]
      ?.replace(",", "."),
  );
  const lowRam = ram > 0 && ram < 16;
  const vram8 = /\b8\s*(?:GB|GO|GIB)\b/.test(gpu);
  const resolution = comfortable ? ("1440p" as const) : ("1080p" as const);
  const quality = integrated
    ? "Bas"
    : comfortable && !lowRam
      ? "Élevé"
      : "Moyen";
  const steps = ready
    ? [
        `${resolution} en résolution native ; gardez la résolution de l’écran si elle est inférieure.`,
        `Préréglage ${quality.toLowerCase()}, ombres moyennes et ray tracing désactivé pour privilégier la régularité.`,
        integrated
          ? "Réduisez la résolution de rendu si le jeu reste lent."
          : /RTX/.test(gpu)
            ? "Si le jeu manque de fluidité, essayez DLSS en mode Qualité lorsqu’il est disponible."
            : "Si le jeu manque de fluidité, essayez FSR en mode Qualité lorsqu’il est disponible.",
        vram8
          ? "Textures moyennes au départ : la variante 8 Go demande de vérifier l’usage de mémoire vidéo."
          : "Montez les textures seulement si la mémoire vidéo et la fluidité le permettent ; la capacité VRAM n’est pas déduite du nom.",
        "Testez une scène exigeante sans génération d’images. Limitez ensuite les FPS à une valeur stable compatible avec les Hz de l’écran.",
      ]
    : ["Identifiez la carte graphique avant de choisir un profil adapté."];
  const priorities = [
    !config.cpu
      ? "Processeur inconnu : impossible de vérifier la marge pour les jeux exigeants en CPU."
      : `Avec ${config.cpu}, vérifiez les chutes de fluidité en jeu avant de décider d’un remplacement du processeur.`,
    !ram
      ? "Capacité RAM inconnue : renseignez-la pour adapter les conseils."
      : lowRam
        ? `${ram} Go de RAM : envisagez 16 Go ou plus si les jeux visés saturent la mémoire ; vérifiez la compatibilité avec la carte mère.`
        : `${ram} Go de RAM : ne l’augmentez pas sans constater une saturation dans vos jeux.`,
    /SSD|NVME|SNV/i.test(config.storage)
      ? "Installez les jeux sur votre SSD ; un achat de stockage se justifie surtout par le manque de place."
      : "Vérifiez si vos jeux sont sur un SSD avant de prévoir un achat de stockage.",
  ];
  return {
    resolution,
    fps: integrated ? 30 : 60,
    quality,
    ready,
    reason: ready
      ? `Le meilleur compromis proposé pour ${config.gpu} : image lisible, préréglage ${quality.toLowerCase()} et fluidité régulière. ${lowRam ? "La RAM limitée impose un profil plus prudent." : "Aucun achat n’est conseillé sans limite constatée."}`
      : "Carte graphique non identifiée avec assez de précision : aucun optimum personnalisé ne peut être établi.",
    steps,
    priorities,
    alternative: integrated
      ? "Jeux légers : testez la résolution native avec des détails bas."
      : "Jeux compétitifs : privilégiez 1080p et des détails bas à moyens pour la réactivité ; mesurez la fluidité obtenue.",
    validation:
      "Conseil à valider : le jeu, les Hz et la résolution de l’écran, la VRAM et les températures ne sont pas connus. Aucun FPS n’a été mesuré ; La fluidité affichée est un objectif de test, pas une promesse.",
    source: /RX\s*9060\s*XT/.test(gpu)
      ? "https://www.amd.com/en/products/graphics/desktops/radeon/9000-series/amd-radeon-rx-9060xt.html"
      : undefined,
  };
}
