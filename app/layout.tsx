import type { Metadata, Viewport } from "next";
import "./globals.css";

const DESCRIPTION =
  "Norn drafts ACMG/AMP evidence for a human curator: it gathers public genomics data, adjudicates each criterion with Claude, and applies the ClinGen points framework. Research and demonstration only.";

// Next auto-attaches the OG and Twitter images from app/opengraph-image.png and
// app/twitter-image.png, and the icons from app/icon.svg and app/apple-icon.png.
export const metadata: Metadata = {
  metadataBase: new URL("https://norn-five.vercel.app"),
  title: {
    default: "Norn: variant interpretation copilot",
    template: "%s · Norn",
  },
  description: DESCRIPTION,
  applicationName: "Norn",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Norn: variant interpretation copilot",
    description: DESCRIPTION,
    url: "/",
    siteName: "Norn",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Norn: variant interpretation copilot",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#17130e",
};

// Applied before first paint so the theme (dark by default) does not flash.
const themeInit = `(function(){try{var p=JSON.parse(localStorage.getItem('norn-prefs')||'{}');var t=(p.theme==='light'||p.theme==='dark')?p.theme:'dark';var s=['clinical','cvd','contrast'].indexOf(p.colorScheme)>-1?p.colorScheme:'clinical';var d=document.documentElement;d.dataset.theme=t;d.dataset.scheme=s;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
