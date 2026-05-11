export const metadata = {
  title: 'Knowledge Boss',
  description: 'Ask. Answer. Boss up. A real-time PvP knowledge battle on Celo.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
