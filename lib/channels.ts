import type { InfluencerChannel } from "@/lib/types";

/**
 * YouTube channels that publish stock recommendations.
 * Add more rows later — other platforms will get their own source adapters.
 */
export const CHANNELS: InfluencerChannel[] = [
  {
    id: "inf-lapizarra-de-andres",
    name: "La Pizarra de Andrés",
    handle: "lapizarradeandres",
    channelId: "UCEXbEm8RUvRkKUEo2RjKd9w",
    channelUrl: "https://www.youtube.com/@lapizarradeandres",
    defaultHorizon: "3M",
    language: "es",
  },
  {
    id: "inf-arte-de-invertir",
    name: "Arte de Invertir",
    handle: "artedeinvertir",
    channelId: "UC-yJ1V3fN75A4dlR6dgRgEg",
    channelUrl: "https://www.youtube.com/@Artedeinvertir",
    defaultHorizon: "6M",
    language: "es",
  },
  {
    id: "inf-jose-luis-cava",
    name: "José Luis Cava",
    handle: "joseluiscavatv",
    channelId: "UCvCCLJkQpRg0NdT3zNcI08A",
    channelUrl: "https://www.youtube.com/@JoseLuisCavatv",
    defaultHorizon: "1M",
    language: "es",
  },
  {
    id: "inf-graham-stephan",
    name: "Graham Stephan",
    handle: "grahamstephan",
    channelId: "UCV6KDgJskWaEckne5aPA0aQ",
    channelUrl: "https://www.youtube.com/@GrahamStephan",
    defaultHorizon: "1M",
    language: "en",
  },
  {
    id: "inf-invertir-desde-cero",
    name: "Invertir desde Cero",
    handle: "invertirdesdecero",
    channelId: "UCYqm8Y6tfO1HvGSIILyfeOA",
    channelUrl: "https://www.youtube.com/@InvertirdesdeCero",
    defaultHorizon: "3M",
    language: "es",
  },
];

export function channelById(id: string): InfluencerChannel | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}

export function channelByYoutubeId(channelId: string): InfluencerChannel | undefined {
  return CHANNELS.find((channel) => channel.channelId === channelId);
}
