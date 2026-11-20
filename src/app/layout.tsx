import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prima Vista",
  description: "Notenlesen üben – Bass- und Violinschlüssel",
  applicationName: "Prima Vista",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Prima Vista", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

// Setzt das gespeicherte Farbschema vor dem ersten Zeichnen, damit nichts flackert.
const themeScript = `try{var t=localStorage.getItem("pv-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="backdrop" aria-hidden>
          <div className="blob blob--a" />
          <div className="blob blob--b" />
          <div className="blob blob--c" />
        </div>
        {children}
      </body>
    </html>
  );
}
