import { LuSearch, LuX } from "react-icons/lu";
import { Input } from "@/components/ui/Input";
import { useT } from "@/i18n";

/**
 * A text field with a magnifier in it and a way out.
 *
 * Lifted out of PlayersPage, which had it spelled by hand, once the public
 * directories needed the same three parts. The clear button is the reason this
 * is a component and not a `className` on <Input>: it has to sit inside the
 * field, which means a positioned wrapper, which is exactly the bit nobody
 * wants to retype.
 *
 * `type="search"` for the semantics and the on-screen keyboard's Go key; the
 * browser's own clear affordance is suppressed in index.css so there is one X,
 * not two.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const { t } = useT();

  return (
    <div className={["relative", className].join(" ")}>
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-faint">
        <LuSearch className="h-4 w-4" aria-hidden />
      </span>
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
        autoFocus={autoFocus}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("common.clear")}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-faint transition-colors hover:text-ink"
        >
          <LuX className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
