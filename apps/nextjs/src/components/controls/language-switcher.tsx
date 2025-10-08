/* agent-frontmatter:start
AGENT: Language switcher component for i18n
PURPOSE: Allow users to switch between different languages
USAGE: <LanguageSwitcher /> - place in navbar or header
FEATURES:
  - Dropdown select with language options from config
  - Preserves current route when switching languages
  - Shows language names in their native form
SEARCHABLE: language switcher, locale switcher, i18n switcher
agent-frontmatter:end */

"use client";

import { i18nConfig } from "@agent-stack/config";
import type { Locale } from "next-intl";
import { useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: Locale) => {
    router.replace({ pathname }, { locale: newLocale });
  };

  const currentLanguage = i18nConfig.locales.find(
    (lang) => lang.code === locale,
  );

  return (
    <Select value={locale} onValueChange={handleLanguageChange}>
      <SelectTrigger size="sm">
        <div className="flex items-center gap-2">
          <SelectValue>
            {currentLanguage?.nativeName || locale.toUpperCase()}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {i18nConfig.locales.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex w-full items-center justify-between">
              <span>{lang.nativeName}</span>
              {lang.code === locale && (
                <span className="ml-2 text-muted-foreground text-xs">✓</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
