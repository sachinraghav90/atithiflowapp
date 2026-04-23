import * as React from "react";

import { cn } from "@/lib/utils";

const DEFAULT_SELECT_PLACEHOLDER = "--Please Select--";

type NativeSelectProps = React.ComponentPropsWithoutRef<"select"> & {
  placeholder?: string;
  placeholderDisabled?: boolean;
};

function findEmptyValueOptionIndex(children: React.ReactNode) {
  return React.Children.toArray(children).findIndex((child) => {
    if (!React.isValidElement(child)) {
      return false;
    }

    if (child.type !== "option") {
      return false;
    }

    return child.props.value === "";
  });
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      className,
      children,
      placeholder = DEFAULT_SELECT_PLACEHOLDER,
      placeholderDisabled = true,
      ...props
    },
    ref,
  ) => {
    const childArray = React.Children.toArray(children);
    const emptyOptionIndex = findEmptyValueOptionIndex(children);
    const emptyOption =
      emptyOptionIndex >= 0 ? childArray[emptyOptionIndex] : undefined;
    const shouldInjectPlaceholder = emptyOptionIndex === -1;
    const normalizedChildren =
      emptyOptionIndex >= 0 &&
      React.isValidElement(emptyOption) &&
      emptyOption.type === "option" &&
      emptyOption.props.disabled
        ? childArray.map((child, index) => {
            if (index !== emptyOptionIndex || !React.isValidElement(child)) {
              return child;
            }

            return React.cloneElement(child, undefined, placeholder);
          })
        : childArray;

    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      >
        {shouldInjectPlaceholder ? (
          <option value="" disabled={placeholderDisabled}>
            {placeholder}
          </option>
        ) : null}
        {normalizedChildren}
      </select>
    );
  },
);

NativeSelect.displayName = "NativeSelect";

export { DEFAULT_SELECT_PLACEHOLDER, NativeSelect };
