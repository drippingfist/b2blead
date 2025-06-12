import type React from "react"
import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "b2blead.ai",
  description: "Get more website leads with our AI. Success guarantee | Risk free trial | No credit card needed",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.className} suppressHydrationWarnings>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global error suppression for Supabase auth network errors
              window.addEventListener('unhandledrejection', function(event) {
                const error = event.reason;
                if (error?.message?.includes('Failed to fetch') && 
                    (error?.stack?.includes('supabase') || error?.stack?.includes('auth-js'))) {
                  console.warn('🔄 Supabase auth network error suppressed:', error.message);
                  event.preventDefault();
                }
              });
              
              window.addEventListener('error', function(event) {
                const error = event.error;
                if (error?.message?.includes('Failed to fetch') && 
                    (error?.stack?.includes('supabase') || error?.stack?.includes('auth-js'))) {
                  console.warn('🔄 Supabase auth error suppressed:', error.message);
                  event.preventDefault();
                }
              });
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
