import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import {
  BoxCubeIcon,
  DollarLineIcon,
  PageIcon,
  ShootingStarIcon,
} from "../../icons";

type QuickLink = {
  label: string;
  description: string;
  to: string;
  icon: React.ReactNode;
};

const quickLinks: QuickLink[] = [
  {
    label: "Home CMS",
    description: "Edit homepage sections and items",
    to: "/home-cms",
    icon: <PageIcon />,
  },
  {
    label: "Products",
    description: "Manage catalog, variants and inventory",
    to: "/products",
    icon: <BoxCubeIcon />,
  },
  {
    label: "Orders",
    description: "Review and ship customer orders",
    to: "/orders",
    icon: <DollarLineIcon />,
  },
  {
    label: "Reviews",
    description: "Approve and moderate product reviews",
    to: "/reviews",
    icon: <ShootingStarIcon />,
  },
];

export default function Home() {
  return (
    <>
      <PageMeta
        title="Maayaa Admin"
        description="Maayaa Admin dashboard"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Welcome to Maayaa Admin
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pick a section below to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                {item.icon}
              </span>
              <div>
                <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                  {item.label}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
