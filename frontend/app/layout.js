import './globals.css';

export const metadata = {
  title: 'KerjaLab — Simulasi Kerja',
  description: 'Coba pekerjaan impianmu lewat simulasi, tanpa penalti.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
