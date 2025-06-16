import type React from "react"
// Remove this import
// import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "b2blead.ai - more leads, less hassle",
  description: "Get more website leads with our AI. Success guarantee | Risk free trial | No credit card needed",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="font-sans" suppressHydrationWarnings>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
      !function(){if(!(window.Gleap=window.Gleap||[]).invoked){window.GleapActions=[];const e=new Proxy({invoked:!0},{get:function(e,n){return"invoked"===n?e.invoked:function(){const e=Array.prototype.slice.call(arguments);window.GleapActions.push({e:n,a:e})}},set:function(e,n,t){return e[n]=t,!0}});window.Gleap=e;const n=document.getElementsByTagName("head")[0],t=document.createElement("script");t.type="text/javascript",t.async=!0,t.src="https://sdk.gleap.io/latest/index.js",n.appendChild(t),
          window.Gleap.initialize("U3MvwoAN40h2VG0hweZeQ9eeAwVQR21A")
      }}();
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
