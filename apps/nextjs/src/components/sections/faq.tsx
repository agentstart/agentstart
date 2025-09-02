import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CornerBorders } from "./corner-borders";

interface FAQProps {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQProps[] = [
  {
    question: "What makes this different from other Next.js templates?",
    answer:
      "This is the first template designed specifically for AI agents, not developers. Every decision - from file structure to error messages - is optimized for AI comprehension and token efficiency. It includes AGENTS.md documentation that serves as a single source of truth for AI tools.",
    value: "item-1",
  },
  {
    question: "What is 'vibe coding' and how does this template enable it?",
    answer:
      "Vibe coding is development through natural language - you describe what you want, and AI builds it. Our template makes this actually work through clear conventions, smart defaults, and agent-optimized architecture. No more fighting with AI about configurations or file locations.",
    value: "item-2",
  },
  {
    question: "What's included out of the box?",
    answer:
      "Everything you need for production: Better Auth for authentication, Stripe for payments, Drizzle ORM for database, tRPC for type-safe APIs, AI SDK for LLM integrations, and smart error handling with auto-fix commands. All pre-configured and ready to use.",
    value: "item-3",
  },
  {
    question: "How does it reduce token usage?",
    answer:
      "Through convention over configuration, clear module boundaries, and the AGENTS.md file that provides instant context. AI agents spend less time understanding your codebase structure and more time building features. We've seen 90% reduction in token usage compared to traditional templates.",
    value: "item-4",
  },
  {
    question: "Which AI tools does it work with?",
    answer:
      "Optimized for Claude, Cursor, GitHub Copilot, and any LLM-based coding assistant. The template's clear structure and conventions are universally understood by AI agents, making it compatible with current and future AI coding tools.",
    value: "item-5",
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="relative border-b py-24 sm:py-32">
      <CornerBorders position="all" />

      <div className="container px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Everything you need to know about building with AI agents
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <Accordion type="single" collapsible className="space-y-4">
            {FAQList.map(({ question, answer, value }) => (
              <AccordionItem
                key={value}
                value={value}
                className="border-muted/50 bg-card/50 hover:border-muted data-[state=open]:border-primary/50 border px-6 backdrop-blur transition-all"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="text-sm font-medium sm:text-base">
                    {question}
                  </span>
                </AccordionTrigger>

                <AccordionContent className="text-muted-foreground pt-2 text-sm">
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
