import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "HealthCare+ | Smart Healthcare Appointment System",
  description: "Book and manage healthcare appointments with ease. Connect with top doctors and manage your health journey effortlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <Navbar />
              <main>
                {children}
              </main>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
