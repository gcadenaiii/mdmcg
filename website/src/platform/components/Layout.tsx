import { Link, useLocation } from "react-router-dom";
import logoUrl from "../../imports/Logo_-_Primary_Lockup.png";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navLinks = [
    { to: "/platform/", label: "Dashboard" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Top nav */}
      <header
        className="flex items-center justify-between px-6 py-3 shadow-sm"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Left: logo + platform label */}
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2">
            <img src={logoUrl} alt="MDMCG" className="h-8 w-auto" />
          </a>
          <span
            className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            Platform
          </span>
        </div>

        {/* Center: nav links */}
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium transition-colors"
                style={{ color: active ? "var(--accent)" : "var(--muted-foreground)" }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: back to site */}
        <a
          href="/"
          className="text-sm transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← mdmcg.com
        </a>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
