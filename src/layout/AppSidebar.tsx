import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import {
  BoxCubeIcon,
  ChevronDownIcon,
  DollarLineIcon,
  GridIcon,
  HorizontaLDots,
  PageIcon,
  ShootingStarIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const catalogItems: NavItem[] = [
  {
    icon: <BoxCubeIcon />,
    name: "Catalog",
    subItems: [
      { name: "Products", path: "/products" },
      { name: "Categories", path: "/categories" },
      { name: "Collections", path: "/collections" },
      { name: "Sizes", path: "/sizes" },
      { name: "Colors", path: "/colors" },
      { name: "Stock Management", path: "/stock" },
      { name: "Product Costs", path: "/costs" },
    ],
  },
];

const salesItems: NavItem[] = [
  {
    icon: <DollarLineIcon />,
    name: "Sales",
    subItems: [
      { name: "Order Management", path: "/orders" },
      { name: "Returns & Refunds", path: "/returns" },
      { name: "Exchanges", path: "/exchanges" },
      { name: "Coupons", path: "/coupons/add" },
    ],
  },
];

const engagementItems: NavItem[] = [
  {
    icon: <ShootingStarIcon />,
    name: "Engagement",
    subItems: [
      { name: "Reviews", path: "/reviews" },
      { name: "Analytics", path: "/analytics" },
      { name: "Expenses", path: "/expenses" },
      { name: "GST Report", path: "/gst-report" },
    ],
  },
];

const contentItems: NavItem[] = [
  {
    icon: <PageIcon />,
    name: "Content",
    subItems: [{ name: "Home CMS", path: "/home-cms" }],
  },
];

const dashboardItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
];

type MenuType = "dashboard" | "catalog" | "sales" | "engagement" | "content";

const MENU_GROUPS: { type: MenuType; label: string; items: NavItem[] }[] = [
  { type: "dashboard", label: "Overview", items: dashboardItems },
  { type: "content", label: "Content", items: contentItems },
  { type: "catalog", label: "Catalog", items: catalogItems },
  { type: "sales", label: "Sales", items: salesItems },
  { type: "engagement", label: "Engagement", items: engagementItems },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: MenuType;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) =>
      path === "/"
        ? location.pathname === "/"
        : location.pathname === path || location.pathname.startsWith(path + "/"),
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    MENU_GROUPS.forEach(({ type, items }) => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type, index });
              submenuMatched = true;
            }
          });
        }
      });
    });
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: MenuType) => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: MenuType) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon-size ${
                    isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/" className="flex items-center gap-2">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="text-2xl font-bold tracking-tight text-brand-500 dark:text-white">
              Maayaa <span className="text-gray-800 dark:text-gray-300 font-medium">Admin</span>
            </span>
          ) : (
            <span className="text-2xl font-bold text-brand-500 dark:text-white">M</span>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {MENU_GROUPS.map(({ type, label, items }) => (
              <div key={type}>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    label
                  ) : (
                    <HorizontaLDots className="size-6" />
                  )}
                </h2>
                {renderMenuItems(items, type)}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
