import { useAuth } from "@/hooks/useAuth";
import { useSignOut } from "@/hooks/useSignOut";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function ProfileMenu() {
    const { user } = useAuth();
    const signOut = useSignOut();
    const [isOpen, setIsOpen] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut.mutateAsync();
            toast.success("Has cerrado sesión correctamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al cerrar sesión");
        }
    };

    if (!user) {
        return (
            <Link
                to="/login"
                className="text-sm font-medium text-red-600 hover:text-red-700 bg-white px-4 py-2 rounded-full shadow-sm border border-red-100 transition-colors"
            >
                Iniciar sesión
            </Link>
        );
    }

    const avatarUrl = user.user_metadata?.avatar_url;
    const userName = user.user_metadata?.full_name || user.email;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 focus:outline-none"
                aria-label="Menú de usuario"
                aria-expanded={isOpen}
            >
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {userName}
                </span>
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={userName}
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold border-2 border-white shadow-sm">
                        {userName?.charAt(0).toUpperCase()}
                    </div>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                        <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {userName}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                handleSignOut();
                                setIsOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
