export const metadata = {
  title: 'PDF Tools - Free Online Editor',
  description: 'Merge, split, compress PDFs online for free',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f0f2f5' }}>
        {children}
      </body>
    </html>
  );
}
