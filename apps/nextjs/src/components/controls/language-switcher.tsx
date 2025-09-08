// AGENT: Language switcher component for i18n
// PURPOSE: Allow users to switch between different languages
// USAGE: <LanguageSwitcher /> - place in navbar or header
// FEATURES:
//   - Dropdown select with language options
//   - Preserves current route when switching languages
//   - Shows language names in their native form
// SEARCHABLE: language switcher, locale switcher, i18n switcher

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: "zh" | "en") => {
    router.push({ pathname }, { locale: newLocale });
  };

  const currentLanguage = languages.find((lang) => lang.code === locale);

  return (
    <Select value={locale} onValueChange={handleLanguageChange}>
      <SelectTrigger size="sm">
        <div className="flex items-center gap-2">
          <Globe className="size-4" />
          <SelectValue>
            {currentLanguage?.nativeName || locale.toUpperCase()}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex w-full items-center justify-between">
              <span>{lang.nativeName}</span>
              {lang.code === locale && (
                <span className="text-muted-foreground ml-2 text-xs">✓</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
