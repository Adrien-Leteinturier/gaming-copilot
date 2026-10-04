import { z } from "zod";
export const configSchema = z.object({
  name: z.string().max(100),
  cpu: z.string().max(150),
  gpu: z.string().max(150),
  motherboard: z.string().max(150),
  ram: z.string().max(150),
  storage: z.string().max(150),
  psu: z.string().max(150),
  resolution: z.enum(["1080p", "1440p", "4K"]),
  targetFps: z.number().int().min(30).max(500),
});
export type PcConfig = z.infer<typeof configSchema>;
export type Alert = {
  id: string;
  component: string;
  target: number;
  currency: "EUR";
  status: "pending-provider";
  createdAt: string;
};
export type Message = { role: "user" | "assistant"; content: string };
export const emptyConfig: PcConfig = {
  name: "Mon setup",
  cpu: "",
  gpu: "",
  motherboard: "",
  ram: "",
  storage: "",
  psu: "",
  resolution: "1440p",
  targetFps: 144,
};
export const fields = {
  cpu: "Processeur",
  gpu: "Carte graphique",
  motherboard: "Carte mère",
  ram: "Mémoire vive",
  storage: "Stockage",
  psu: "Alimentation",
};
