import { useI18n } from "@/i18n";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Compass,
  Heart,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

const sections = [
  {
    label: "Browse",
    items: [
      { label: "Explore", to: "/", Icon: Compass },
      { label: "Saved", to: "/saved", Icon: Heart },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Listings", to: "/sell", Icon: Building2 },
      { label: "Admin", to: "/admin", Icon: ShieldCheck },
      { label: "Accounts", to: "/admin/accounts", Icon: UsersRound },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Profile", to: "/profile", Icon: UserRound }],
  },
] as const;

export function MarketplaceSidebar({
  id,
  collapsed,
  showAdmin,
  showProfile,
  favoriteCount,
  onNavigate,
}: {
  id?: string;
  collapsed: boolean;
  showAdmin: boolean;
  showProfile: boolean;
  favoriteCount: number;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const visibleSections = sections.filter(
    ({ label }) =>
      label === "Browse" || (label === "Workspace" ? showAdmin : showProfile),
  );
  return (
    <nav
      id={id}
      aria-label={t("Sidebar navigation")}
      className={`min-h-0 flex-1 overflow-y-auto py-3 ${collapsed ? "px-0.5 sm:px-2" : "px-3"}`}
    >
      {visibleSections.map(({ label, items }) => (
        <div
          key={label}
          className="border-b border-base-300 py-3 first:pt-0 last:border-b-0"
        >
          <p
            className={
              collapsed
                ? "sr-only"
                : "mb-2 px-3 text-[.68rem] font-bold tracking-[.16em] text-base-content/60 uppercase"
            }
          >
            {t(label)}
          </p>
          <ul className="space-y-1">
            {items.map(({ label, to, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: true, includeSearch: false }}
                  title={collapsed ? t(label) : undefined}
                  onClick={onNavigate}
                  className={`flex min-h-11 items-center gap-3 rounded-field text-sm font-semibold whitespace-nowrap text-base-content/75 transition-colors hover:bg-base-200 hover:text-primary focus-visible:-outline-offset-2 [&.active]:bg-primary/10 [&.active]:text-primary ${collapsed ? "justify-center" : "px-3"}`}
                >
                  <Icon
                    size={19}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <span className={collapsed ? "sr-only" : undefined}>
                    {t(label)}
                  </span>
                  {!collapsed && label === "Saved" && favoriteCount > 0 && (
                    <span className="badge badge-sm ms-auto" aria-hidden="true">
                      {favoriteCount > 99 ? "99+" : favoriteCount}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
