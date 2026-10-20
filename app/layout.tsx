import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "ReelRank — la stagione dei creator",
  description: "Scopri, vota e celebra i migliori Reel e content creator.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
