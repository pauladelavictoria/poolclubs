import { useState, useEffect } from "react";
import type { Category } from "@/types";

type PlayerFormProps = {
    initialValues?: {
        name: string;
        category: Category;
    };
    onSubmit: (values: { name: string; category: Category }) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
};

export default function PlayerForm({
    initialValues,
    onSubmit,
    onCancel,
    isSubmitting = false,
}: PlayerFormProps) {
    const [name, setName] = useState(initialValues?.name ?? "");
    const [category, setCategory] = useState<Category>(
        initialValues?.category ?? 3
    );

    useEffect(() => {
        if (initialValues) {
            setName(initialValues.name);
            setCategory(initialValues.category);
        }
    }, [initialValues]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, category });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                >
                    Nombre
                </label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm px-3 py-2 border"
                    required
                    disabled={isSubmitting}
                />
            </div>

            <div>
                <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700"
                >
                    Categoría
                </label>
                <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(Number(e.target.value) as Category)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm px-3 py-2 border"
                    disabled={isSubmitting}
                >
                    <option value={1}>Primera</option>
                    <option value={2}>Segunda</option>
                    <option value={3}>Tercera</option>
                </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    disabled={isSubmitting}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !name.trim()}
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
            </div>
        </form>
    );
}
