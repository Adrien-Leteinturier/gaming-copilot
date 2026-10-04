import type { PcConfig } from "./domain";

// Editorial starting profiles, not measured FPS or a benchmark database.
export function recommendProfile(config: PcConfig) {
  const gpu = config.gpu.toUpperCase();
  const known = /(?:RTX|GTX|RX)\s*\d{3,4}/.test(gpu);
  const comfortable =
    /RTX\s*(?:[345]0(?:70|80|90))|RX\s*(?:6[89]00|7[89]00|9060\s*XT|9070)/.test(
      gpu,
    );
  const integrated = /IRIS|UHD|INTEGRATED|INTÉGRÉ|RADEON GRAPHICS/.test(gpu);
  return {
    resolution: comfortable ? ("1440p" as const) : ("1080p" as const),
    fps: integrated ? 30 : 60,
    quality: integrated ? "Bas" : comfortable ? "Élevé" : "Moyen",
    ready: known || integrated,
    reason: !gpu
      ? "Identifiez votre GPU pour personnaliser ce profil."
      : !known && !integrated
        ? "Référence GPU non reconnue : profil prudent, sans classement supposé."
        : "Profil de départ estimé d’après la famille du GPU. Le jeu, le CPU et le refroidissement peuvent changer le résultat.",
    steps: [
      "Ray tracing désactivé au départ",
      "Réduire les ombres et les effets si la fluidité baisse",
      "Mesurer en jeu avant de monter la qualité ou la résolution",
    ],
  };
}
