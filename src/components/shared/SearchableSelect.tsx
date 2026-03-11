import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableSelectItem = {
  value: string;
  label: string;
  keywords?: string[];
  disabled?: boolean;
};

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  onSearch?: (value: string) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
}

const SearchableSelect = ({
  items,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  triggerClassName,
  contentClassName,
  disabled,
  multiple = false,
  onSearch,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedValues = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );
  const selected = useMemo(
    () => items.find((item) => item.value === selectedValues[0]),
    [items, selectedValues],
  );
  const selectedCount = selectedValues.length;
  const displayLabel = multiple
    ? selectedCount > 0
      ? `${selectedCount} selected`
      : placeholder
    : selected
      ? selected.label
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", triggerClassName)}
          disabled={disabled}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", className, contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {items.map((item) => (
              <CommandItem
                key={item.value}
                value={`${item.label} ${(item.keywords ?? []).join(" ")}`.trim()}
                onSelect={() => {
                  if (!multiple) {
                    onChange(item.value);
                    setOpen(false);
                    return;
                  }
                  const next = selectedValues.includes(item.value)
                    ? selectedValues.filter((v) => v !== item.value)
                    : [...selectedValues, item.value];
                  onChange(next);
                }}
                disabled={item.disabled}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedValues.includes(item.value) ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
