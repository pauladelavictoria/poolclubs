import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={`mt-1 block w-full rounded-md border-dark-border bg-white text-gray-800 shadow-sm focus:border-accent-red focus:ring-accent-red sm:text-sm px-3 py-2 border disabled:opacity-50 ${className || ""}`}
        ref={ref}
        {...props}
      />
    );
  },
);
Select.displayName = "Select";
