import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Label } from './label';
import { cn } from '../../lib/utils';
import { ROLE_ICONS, getIconsByCategory, getIconByValue } from '../../lib/role-icons';

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const CurrentIcon = getIconByValue(value);
  const iconsByCategory = getIconsByCategory();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-auto min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            <span>{ROLE_ICONS.find(i => i.value === value)?.label || 'Select icon'}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-1">
          {Object.entries(iconsByCategory).map(([category, icons]) => (
            <div key={category} className="mb-3">
              <Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {category}
              </Label>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {icons.map((icon) => (
                  <button
                    key={icon.value}
                    onClick={() => {
                      onChange(icon.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                      value === icon.value && 'bg-accent'
                    )}
                  >
                    <icon.Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left truncate">{icon.label}</span>
                    {value === icon.value && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
