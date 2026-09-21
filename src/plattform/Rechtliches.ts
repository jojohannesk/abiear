// Anbieterkennzeichnung. Aus `System/Rechtliches.swift` — dieselben Angaben.

export const Impressum = {
  name: "Johannes Javor",
  strasse: "Heidenheimer Straße 11",
  plzOrt: "89542 Herbrechtingen",
  land: "Deutschland",
  email: "johannes.javor@icloud.com",
  telefon: "",
  standDatenschutz: "17. September 2026",
  get ausgefuellt(): boolean {
    return ![this.name, this.strasse, this.plzOrt, this.email].some((s) => s.startsWith("«"));
  },
};

export const VERSION = "1.0 (Web)";
