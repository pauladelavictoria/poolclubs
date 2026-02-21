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
    initialValues?.category ?? 3,
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
          className="block text-sm font-medium text-gray-300"
        >
          Nombre
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-dark-border bg-dark-bg text-white shadow-sm focus:border-accent-red focus:ring-accent-red sm:text-sm px-3 py-2 border placeholder-gray-500"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-300"
        >
          Categoría
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(Number(e.target.value) as Category)}
          className="mt-1 block w-full rounded-md border-dark-border bg-dark-bg text-white shadow-sm focus:border-accent-red focus:ring-accent-red sm:text-sm px-3 py-2 border"
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
          className="inline-flex justify-center rounded-md border border-dark-border bg-dark-card px-4 py-2 text-sm font-medium text-gray-300 shadow-sm hover:bg-dark-card-hover focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-offset-2 focus:ring-offset-dark-bg"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="inline-flex justify-center rounded-md border border-transparent bg-accent-red px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-red-hover focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50"
        >
          {isSubmitting ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
