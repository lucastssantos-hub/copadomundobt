import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canetta",
  description: "Registros de jornada GLP-1 para consulta"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="shell">
          <div className="phone">{children}</div>
        </main>
      </body>
    </html>
  );
}
