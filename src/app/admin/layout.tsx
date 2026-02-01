import { redirect } from "next/navigation";
import Link from "next/link";
import { Database, Upload, Home, Settings } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if admin is enabled
  const adminEnabled = process.env.ADMIN_ENABLED === "true";

  if (!adminEnabled) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <span className="text-xl font-bold">Admin Panel</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to App
            </Link>
          </nav>
        </div>
      </header>

      {/* Admin Content */}
      <div className="container mx-auto flex gap-6 p-6">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <nav className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Database className="h-4 w-4" />
              Competencies
            </Link>
            <Link
              href="/admin/import"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
