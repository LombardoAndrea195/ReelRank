import type { Metadata } from "next";
import { Bricolage_Grotesque, Radio_Canada } from "next/font/google";
import "./styles.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--face-display", display: "swap" });
const body = Radio_Canada({ subsets: ["latin"], weight: ["400", "500"], variable: "--face-body", display: "swap" });

export const metadata: Metadata = {
  title: "ReelRank — la stagione dei creator",
  description: "Scopri, vota e celebra i migliori Reel e content creator.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>;
}
