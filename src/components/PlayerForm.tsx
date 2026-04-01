import { useState } from "react";
import type { Category } from "@/types";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Label } from "./ui/Label";
import { Button } from "./ui/Button";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, category });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="category">Categoría</Label>
        <Select
          id="category"
          value={category}
          onChange={(e) => setCategory(Number(e.target.value) as Category)}
          disabled={isSubmitting}
        >
          <option value={1}>Primera</option>
          <option value={2}>Segunda</option>
          <option value={3}>Tercera</option>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
