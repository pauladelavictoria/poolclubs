import { Outlet } from "react-router-dom";
import NavRail from "@/components/NavRail";

export default function Layout() {
  return (
    <div className="min-h-dvh md:pl-[72px]">
      <NavRail />
      {/* Clear the bottom tab bar on phones, including the home-indicator inset */}
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>
    </div>
  );
}
