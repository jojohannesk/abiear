// Die eine Fähigkeit, die der Store von der Erinnerung braucht: nach einem
// Lauf neu planen, damit die heutige Mitteilung entfällt. Portierung von
// `Models/Erinnerungsplaner.swift`.

import type { StatisticsInsights } from "./StatisticsInsights";

export interface Erinnerungsplaner {
  neuPlanen(insights: StatisticsInsights): Promise<void>;
}
