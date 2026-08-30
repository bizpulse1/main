"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  BoltIcon,
  PlayCircleIcon,
  ChartBarIcon,
  WalletIcon,
  UserGroupIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  TrophyIcon,
  Cog6ToothIcon,
  TruckIcon,
  ArchiveBoxIcon,
  BuildingOffice2Icon,
  WrenchScrewdriverIcon,
  Square3Stack3DIcon,
  BeakerIcon,
  RocketLaunchIcon,
  BuildingOfficeIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/client";
import { CompanyAvatar } from "./CompanyAvatar";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
}

const CORE_ITEMS: NavItem[] = [
  { href: "/turn", label: "Turn", icon: PlayCircleIcon },
  { href: "/dashboard", label: "Results", icon: ChartBarIcon },
  { href: "/treasury", label: "Treasury", icon: WalletIcon },
];

// Shown to every company regardless of activity_type.
const COMMERCIAL_ITEMS: NavItem[] = [
  { href: "/hr", label: "Team", icon: UserGroupIcon },
  { href: "/marketing", label: "Marketing", icon: MegaphoneIcon },
  { href: "/arguments", label: "Sales arguments", icon: ChatBubbleLeftRightIcon },
  { href: "/bank", label: "Loans", icon: BuildingLibraryIcon },
  { href: "/insurance", label: "Insurance", icon: ShieldCheckIcon },
  { href: "/bourse", label: "Bourse", icon: ArrowTrendingUpIcon },
  { href: "/rse", label: "RSE", icon: GlobeAltIcon },
  { href: "/standings", label: "Standings", icon: TrophyIcon },
];

// Only meaningful once the company has actually gone industrial — every
// one of these pages redirects straight back to /turn otherwise. Showing
// them unconditionally is exactly what produced the "clicking Machine
// just bounces me to Turn" bug: the link looked broken because it led
// somewhere that immediately redirected away with no explanation.
const INDUSTRIAL_ITEMS: NavItem[] = [
  { href: "/machine", label: "Machine", icon: Cog6ToothIcon },
  { href: "/raw-supplier", label: "Raw material supplier", icon: TruckIcon },
  { href: "/raw-purchase", label: "Raw material purchase", icon: ArchiveBoxIcon },
  { href: "/production", label: "Production target", icon: BuildingOffice2Icon },
  { href: "/maintenance", label: "Maintenance", icon: WrenchScrewdriverIcon },
  { href: "/assembly-line", label: "Assembly line", icon: Square3Stack3DIcon },
  { href: "/rd", label: "R&D", icon: BeakerIcon },
];

function NavLink({
  item,
  active,
  companyId,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  companyId: string;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={`${item.href}?company=${companyId}`}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-bp-bg text-bp-gold border border-bp-gold/40"
          : "text-bp-text-muted hover:text-bp-text hover:bg-bp-bg"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function GameNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") ?? "";
  const [moreOpen, setMoreOpen] = useState(false);
  const [company, setCompany] = useState<{
    name: string;
    capital: number;
    activity_type: string;
    color: string;
  } | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    supabase
      .from("companies")
      .select("name, capital, activity_type, color")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (data) setCompany(data);
      });
  }, [companyId]);

  const isIndustrial = company?.activity_type === "industrial";
  const secondaryItems = [
    ...COMMERCIAL_ITEMS,
    ...(isIndustrial ? INDUSTRIAL_ITEMS : []),
  ];
  const transitionItem: NavItem = isIndustrial
    ? { href: "/upgrade", label: "Upgrade plan", icon: RocketLaunchIcon }
    : { href: "/transition", label: "Go industrial", icon: BuildingOfficeIcon };

  function isActive(href: string) {
    return pathname === href;
  }

  return (
    <>
      {/* Desktop: fixed left sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 border-r border-bp-border bg-bp-surface px-3 py-4 overflow-y-auto">
        <Link href={`/turn?company=${companyId}`} className="px-3 mb-4 flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-bp-gold" />
          <span className="font-display font-bold text-bp-gold tracking-wide">
            BIZ PULSE
          </span>
        </Link>

        {company && (
          <div className="px-3 mb-4 pb-4 border-b border-bp-border flex items-center gap-3">
            <CompanyAvatar name={company.name} color={company.color} />
            <div>
              <p className="text-bp-text text-sm font-medium truncate">{company.name}</p>
              <p className="text-bp-gold text-xs mt-0.5">
                ${company.capital.toLocaleString("en-US")}
              </p>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {CORE_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} companyId={companyId} />
          ))}
        </nav>

        <p className="px-3 mt-5 mb-1 text-xs text-bp-text-muted uppercase tracking-wide">
          Manage
        </p>
        <nav className="flex flex-col gap-1">
          {secondaryItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} companyId={companyId} />
          ))}
        </nav>

        <div className="mt-auto pt-4">
          <NavLink item={transitionItem} active={isActive(transitionItem.href)} companyId={companyId} />
        </div>
      </aside>

      {/* Mobile: fixed bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-bp-border bg-bp-bg/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {CORE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={`${item.href}?company=${companyId}`}
                className={`flex flex-col items-center gap-1 py-2 text-xs ${
                  isActive(item.href) ? "text-bp-gold" : "text-bp-text-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href={`/hr?company=${companyId}`}
            className={`flex flex-col items-center gap-1 py-2 text-xs ${
              isActive("/hr") ? "text-bp-gold" : "text-bp-text-muted"
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
            Team
          </Link>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 py-2 text-xs ${
              moreOpen ? "text-bp-gold" : "text-bp-text-muted"
            }`}
          >
            <Bars3Icon className="w-5 h-5" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile: "More" overlay sheet — same filtered item set as the
          desktop sidebar's "Manage" section, so a commercial company
          never sees a link that just bounces it back to /turn. */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-bp-surface border-t border-bp-border p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-bp-text font-display font-semibold">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="text-bp-text-muted"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[...secondaryItems.filter((i) => i.href !== "/hr"), transitionItem].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={`${item.href}?company=${companyId}`}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm ${
                      isActive(item.href)
                        ? "border-bp-gold text-bp-gold"
                        : "border-bp-border text-bp-text"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
