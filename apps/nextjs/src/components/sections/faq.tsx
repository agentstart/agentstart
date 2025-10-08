/* agent-frontmatter:start
AGENT: FAQ section component with i18n support
PURPOSE: Display frequently asked questions with expandable answers
USAGE: <FAQSection /> - typically on landing or support pages
FEATURES:
  - Accordion-style Q&A layout
  - Corner border decorations
  - Customizable FAQ list
  - i18n support using next-intl
CUSTOMIZATION: Modify FAQList array to update questions
SEARCHABLE: faq section, questions, frequently asked questions
agent-frontmatter:end */

"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CornerBorders } from "./corner-borders";

export const FAQSection = () => {
  const t = useTranslations("sections.faq");

  const FAQList = [
    {
      question: t("items.different.question"),
      answer: t("items.different.answer"),
      value: "item-1",
    },
    {
      question: t("items.vibe.question"),
      answer: t("items.vibe.answer"),
      value: "item-2",
    },
    {
      question: t("items.included.question"),
      answer: t("items.included.answer"),
      value: "item-3",
    },
    {
      question: t("items.tokens.question"),
      answer: t("items.tokens.answer"),
      value: "item-4",
    },
    {
      question: t("items.aitools.question"),
      answer: t("items.aitools.answer"),
      value: "item-5",
    },
  ];
  return (
    <section id="faq" className="relative border-b py-24 sm:py-32">
      <CornerBorders position="all" />

      <div className="container px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-bold text-3xl tracking-tight sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <Accordion type="single" collapsible className="space-y-4">
            {FAQList.map(({ question, answer, value }) => (
              <AccordionItem
                key={value}
                value={value}
                className="border border-muted/50 bg-card/50 px-6 backdrop-blur transition-all hover:border-muted data-[state=open]:border-primary/50"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-medium text-sm sm:text-base">
                    {question}
                  </span>
                </AccordionTrigger>

                <AccordionContent className="pt-2 text-muted-foreground text-sm">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
