import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSignOut } from "@/hooks/useSignOut";
import { toast } from "react-toastify";
import { NAV_SECTIONS, type NavItem } from "@/components/navItems";
import {
  LuUser,
  LuClipboardList,
  LuChartColumn,
  LuLogOut,
} from "react-icons/lu";

const item = ({ isActive }: { isActive: boolean }) =>
  [
    "flex h-10 items-center gap-3 rounded-control px-3 text-body",
    "transition-colors duration-150",
    isActive
      ? "bg-strike-tint font-medium text-strike"
      : "text-ink-soft hover:bg-felt-raised hover:text-ink",
  ].join(" ");

function Heading({ children }: { children: string }) {
  return (
    <div className="px-3 pb-1 pt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </div>
  );
}

export default function NavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { user, player } = useAuth();
  const signOut = useSignOut();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Without a linked player these point at /me/*, which sits behind
  // ProtectedRoute and so asks for login first.
  const me = player ? `/players/${player.id}` : "/me";
  const sections = NAV_SECTIONS.map((section) =>
    section.heading === "Entrenamiento"
      ? {
          ...section,
          items: [
            ...section.items,
            { to: `${me}/training/plan`, label: "Mi plan", icon: LuClipboardList },
            {
              to: `${me}/training`,
              label: "Mi progreso",
              icon: LuChartColumn,
            },
          ] as NavItem[],
        }
      : section
  );

  const handleSignOut = async () => {
    onClose();
    try {
      await signOut.mutateAsync();
      toast.success("Has cerrado sesión correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <dialog
      ref={ref}
      // Native <dialog> gives backdrop, Esc-to-close and focus trap free
      className="drawer fixed left-0 top-0 m-0 h-dvh max-h-dvh w-[19rem] max-w-[86vw] overflow-y-auto border-r border-hairline bg-felt text-ink"
      aria-label="Navegación"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <nav className="p-3" onClick={onClose}>
        <div className="flex items-center gap-3 px-3 pb-4 pt-2">
          <img src="/ball.png" alt="" className="h-9 w-9 rounded-full" />
          <div className="min-w-0">
            <div className="truncate text-h4 font-semibold">PoolValencia</div>
            {player && (
              <div className="truncate text-caption text-ink-faint">
                {player.name}
              </div>
            )}
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.heading}>
            <Heading>{section.heading}</Heading>
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={item}>
                <Icon className="h-[18px] w-[18px]" /> {label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="mt-5 border-t border-hairline pt-3">
          <NavLink to={me} end className={item}>
            <LuUser className="h-[18px] w-[18px]" /> Mi perfil
          </NavLink>
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-body text-ink-soft transition-colors duration-150 hover:bg-felt-raised hover:text-ink"
            >
              <LuLogOut className="h-[18px] w-[18px]" /> Cerrar
              sesión
            </button>
          ) : (
            <NavLink to="/login" className={item}>
              <LuLogOut className="h-[18px] w-[18px]" /> Iniciar
              sesión
            </NavLink>
          )}
        </div>
      </nav>
    </dialog>
  );
}
