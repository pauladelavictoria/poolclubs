import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`mt-1 block w-full rounded-md border-dark-border bg-white text-gray-800 shadow-sm focus:border-accent-red focus:ring-accent-red sm:text-sm px-3 py-2 border placeholder-gray-500 disabled:opacity-50 ${className || ""}`}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
