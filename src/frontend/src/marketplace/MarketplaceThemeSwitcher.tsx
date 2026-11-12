import { useI18n } from "@/i18n";
import {
  type MarketplaceThemePreference,
  themeService,
} from "@/services/themeService";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

const themeOptions = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

export function MarketplaceThemeSwitcher() {
  const { t } = useI18n();
  const [preference, setPreference] = useState(
    themeService.getMarketplacePreference,
  );
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedOption = useRef<HTMLInputElement>(null);
  const optionsId = useId();
  const { Icon: ActiveIcon } =
    themeOptions.find(({ value }) => value === preference) ?? themeOptions[0];

  useLayoutEffect(
    () => themeService.watchMarketplaceTheme(preference),
    [preference],
  );

  useEffect(() => {
    if (!open) return;
    selectedOption.current?.focus();
    function closeOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function select(next: MarketplaceThemePreference) {
    themeService.saveMarketplacePreference(next);
    setPreference(next);
    close();
  }

  return (
    <div
      ref={root}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div
        className={open ? undefined : "tooltip tooltip-bottom"}
        data-tip={open ? undefined : t("Theme")}
      >
        <button
          ref={trigger}
          type="button"
          className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary"
          aria-label={t("Theme")}
          aria-expanded={open}
          aria-controls={optionsId}
          onClick={() => setOpen((current) => !current)}
        >
          <ActiveIcon className="size-[17px]" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <fieldset
          id={optionsId}
          className="absolute right-0 top-full z-50 mt-3 w-40 rounded-field border border-base-300 border-t-primary bg-base-200 p-2 shadow-xl"
        >
          <legend className="sr-only">{t("Theme")}</legend>
          {themeOptions.map(({ value, label, Icon }) => {
            const selected = preference === value;
            return (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field px-3 text-sm hover:bg-base-300 has-[:focus-visible]:outline has-[:focus-visible]:outline-primary"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="grow">{t(label)}</span>
                <input
                  ref={selected ? selectedOption : undefined}
                  className="sr-only"
                  type="radio"
                  name={optionsId}
                  value={value}
                  checked={selected}
                  onClick={() => {
                    if (selected) select(value);
                  }}
                  onChange={() => select(value)}
                />
                {selected && (
                  <Check
                    className="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                )}
              </label>
            );
          })}
        </fieldset>
      )}
    </div>
  );
}
