import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "white" | "ghost"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    // Base classes for structure and behaviour
    let baseClasses = "inline-flex items-center justify-center rounded-md font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 transition-colors"
    
    // Add default padding if not ghost
    if (variant !== "ghost") {
      baseClasses += " border px-4 py-2 text-sm"
    }

    // Variant specific colors
    const variants = {
      primary: "border-transparent bg-accent-red text-white hover:bg-accent-red-hover",
      secondary: "border-dark-border bg-dark-card text-gray-300 hover:bg-dark-card-hover",
      white: "border-gray-200 bg-white text-gray-800 hover:bg-gray-100",
      ghost: "shadow-none border-transparent bg-transparent hover:bg-blue-900/20 text-gray-400 hover:text-blue-400 p-1.5 rounded-md", // Custom for icon buttons
    }

    const variantClasses = variants[variant]

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${className || ""}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
