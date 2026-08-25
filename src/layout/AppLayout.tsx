import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { useReadOnly } from "../hooks/useReadOnly";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const readOnly = useReadOnly();

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        {readOnly && (
          <div className="border-b border-warning-500/30 bg-warning-50 px-4 py-2.5 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400 md:px-6">
            You have read-only access. You can view everything here, but not make
            changes.
          </div>
        )}
        <div className="w-full p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
