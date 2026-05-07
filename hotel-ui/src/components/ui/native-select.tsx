import * as React from "react";
import { cn } from "@/lib/utils";
import { MenuItemSelect } from "@/components/MenuItemSelect";

const DEFAULT_SELECT_PLACEHOLDER = "--Please Select--";

type NativeSelectProps = React.ComponentPropsWithoutRef<"select"> & {
  placeholder?: string;
  placeholderDisabled?: boolean;
  hideIcon?: boolean;
  isVertical?: boolean;
};

/**
 * Global Premium Select Component
 * Refined to strip legacy borders/padding when rendering the premium UI.
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      className,
      children,
      placeholder = DEFAULT_SELECT_PLACEHOLDER,
      value,
      onChange,
      disabled,
      hideIcon,
      isVertical,
      ...props
    },
    ref,
  ) => {
    // Extract options from standard React <option> children
    const options = React.useMemo(() => {
      return React.Children.toArray(children)
        .map((child) => {
          if (React.isValidElement(child) && child.type === "option") {
            return {
              id: child.props.value,
              label: child.props.children?.toString() || String(child.props.value),
            };
          }
          return null;
        })
        .filter((opt): opt is { id: string | number; label: string } => opt !== null);
    }, [children]);

    const handleSelect = (val: string | number) => {
      if (onChange) {
        const event = {
          target: {
            value: val,
            name: props.name,
          },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(event);
      }
    };

    // Strip common legacy styling classes that would cause "double-bordering" or misalignment
    const cleanedClassName = className
        ?.replace(/\bborder\b/g, "")
        ?.replace(/\bborder-border\b/g, "")
        ?.replace(/\bborder-input\b/g, "")
        ?.replace(/\bpx-\d+\b/g, "")
        ?.replace(/\bbg-\w+\b/g, "")
        ?.replace(/\brounded-\w+\b/g, "")
        ?.replace(/\bh-\d+\b/g, "")
        ?.trim();

    return (
      <div className={cn("w-full", cleanedClassName)}>
        <MenuItemSelect
          value={value as string | number}
          items={options}
          onSelect={handleSelect}
          itemName="label"
          placeholder={placeholder}
          disabled={disabled}
          hideIcon={hideIcon}
          isVertical={isVertical}
          extraClasses={className} // Pass original classes to let MenuItemSelect handle borders if needed, or stick to standard
        />
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
          tabIndex={-1}
          aria-hidden="true"
        >
          {children}
        </select>
      </div>
    );
  },
);

NativeSelect.displayName = "NativeSelect";

export { DEFAULT_SELECT_PLACEHOLDER, NativeSelect };
