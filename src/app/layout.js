import "./globals.css";

export const metadata = {
  title: "Motor Credito Vehicular",
  description: "Sistema para simular, registrar y gestionar creditos vehiculares.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.style.colorScheme = theme;
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
