import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "amber" | "cyan";
  size?: "default" | "sm" | "lg" | "icon" | "xs";
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, loading = false, loadingText = "Working…", ...props }, ref) => {
    const variantStyles = {
      default: "gali-button-primary",
      destructive: "bg-negative-soft text-negative border border-negative-line hover:bg-negative-soft hover:border-negative-line",
      outline: "border border-line bg-surface text-ink-soft hover:bg-surface-hover hover:border-line-strong hover:text-ink",
      secondary: "bg-surface-hover text-ink-soft hover:bg-surface-hover hover:text-ink border border-line-strong",
      ghost: "hover:bg-surface-hover hover:text-ink text-muted",
      link: "text-brand underline-offset-4 hover:underline p-0 h-auto",
      amber: "gali-button-primary",
      cyan: "bg-info-soft text-info border border-info-line hover:bg-info-soft hover:border-info-line",
    }[variant];

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 min-h-8 px-3 text-[12px]",
      xs: "h-8 min-h-8 px-2.5 text-[12px]",
      lg: "h-12 px-6 text-sm",
      icon: "h-10 w-10 p-0",
    }[size];

    const buttonClassName = cn(
      "gali-button whitespace-nowrap focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
      variantStyles,
      sizeStyles,
      className
    );

    // asChild merges our styling onto the single child element (e.g. next/link's
    // <Link>) instead of wrapping it in a real <button> -- rendering an <a> nested
    // inside a <button> is invalid HTML and breaks keyboard/screen-reader behavior.
    const { children, ...restProps } = props;
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        ...restProps,
        className: cn(buttonClassName, child.props.className),
        ref,
      } as React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> });
    }

    return (
      <button className={buttonClassName} ref={ref} {...restProps} disabled={loading || restProps.disabled} aria-busy={loading || undefined} data-loading={loading || undefined}>
        {loading ? <><Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />{loadingText}</> : children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
