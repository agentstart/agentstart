/* agent-frontmatter:start
AGENT: Type metadata table
PURPOSE: Render property documentation using shared table primitives
USAGE: <TypeTable type={schema} />
EXPORTS: TypeTable
FEATURES:
  - Collapsible rows with nested detail sections
  - Leverages Frame + Table styling
  - Supports parameters, returns, and nested properties
SEARCHABLE: docs type table, property reference, metadata table
agent-frontmatter:end */

"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { CodeBlock } from "@/components/agent/code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ParameterNode {
  name: string;
  description: ReactNode;
}

interface TypeTableEntry {
  type: ReactNode;
  description?: ReactNode;
  typeDescription?: ReactNode;
  typeDescriptionLink?: string;
  default?: ReactNode;
  required?: boolean;
  deprecated?: boolean;
  parameters?: ParameterNode[];
  returns?: ReactNode;
  properties?: Record<string, TypeTableEntry>;
}

interface TypeTableProps {
  type: Record<string, TypeTableEntry>;
}

function formatTypeSignature(signature: string): string {
  if (signature.startsWith("Array<") && signature.endsWith(">")) {
    const inner = signature.slice(6, -1);
    if (inner.includes("{")) {
      const formatted = formatTypeSignature(inner);
      return `Array<\n${formatted
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}\n>`;
    }
  }

  if (signature.includes("{") && signature.includes("}")) {
    const startIdx = signature.indexOf("{");
    const endIdx = signature.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1) {
      const prefix = signature.slice(0, startIdx);
      const content = signature.slice(startIdx + 1, endIdx).trim();
      const suffix = signature.slice(endIdx + 1);

      const parts: string[] = [];
      let current = "";
      let depth = 0;

      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;

        if (char === ";" && depth === 0) {
          if (current.trim()) {
            parts.push(current.trim());
          }
          current = "";
        } else {
          current += char;
        }
      }

      if (current.trim()) {
        parts.push(current.trim());
      }

      if (parts.length > 0) {
        const formatted = parts.map((part) => `  ${part};`).join("\n");
        return `${prefix}{\n${formatted}\n}${suffix}`;
      }
    }
  }

  return signature;
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <p className="font-semibold text-muted-foreground text-xs uppercase">
        {label}
      </p>
      <div className="text-muted-foreground text-sm">{children}</div>
    </section>
  );
}

function PropertyList({
  properties,
}: {
  properties: Record<string, TypeTableEntry>;
}) {
  return (
    <div className="space-y-3 border-s ps-4">
      {Object.entries(properties).map(([propertyName, property]) => (
        <div key={propertyName} className="space-y-1">
          <div className="flex items-baseline gap-2">
            <code className="font-mono text-foreground text-xs">
              {propertyName}
              {property.required ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">?</span>
              )}
            </code>
            <code
              className={cn(
                "font-mono text-muted-foreground text-xs",
                property.deprecated && "line-through",
              )}
            >
              {property.type}
            </code>
            {property.default && (
              <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
                {property.default}
              </code>
            )}
          </div>
          {property.description && (
            <p className="text-muted-foreground text-sm">
              {property.description}
            </p>
          )}
          {property.properties && (
            <PropertyList properties={property.properties} />
          )}
        </div>
      ))}
    </div>
  );
}

function TypeRow({ name, entry }: { name: string; entry: TypeTableEntry }) {
  const [isOpen, setIsOpen] = useState(false);

  const isComplexTypeDescription = (typeDesc: unknown): boolean => {
    if (!typeDesc) return false;
    const str = typeDesc.toString().trim();
    const simpleTypes = ["integer", "string", "number", "boolean", "null"];
    const isSimpleType = simpleTypes.includes(str);
    const isSimpleFormat = /^string \([^)]+\)$/.test(str);
    return (
      !isSimpleType &&
      !isSimpleFormat &&
      str.length > 0 &&
      (str.includes("{") || str.includes("Array<") || str.includes("|"))
    );
  };

  const hasDescription =
    entry.description && entry.description.toString().trim().length > 0;
  const hasTypeDescription =
    entry.typeDescription &&
    entry.typeDescription !== entry.type &&
    isComplexTypeDescription(entry.typeDescription);
  const hasParameters = Boolean(entry.parameters?.length);
  const hasReturns =
    entry.returns && entry.returns.toString().trim().length > 0;
  const hasProperties = Boolean(
    entry.properties && Object.keys(entry.properties).length,
  );
  const hasDefault = Boolean(entry.default);
  const hasDeprecated = Boolean(entry.deprecated);

  const hasDetails =
    hasDescription ||
    hasTypeDescription ||
    hasParameters ||
    hasReturns ||
    hasProperties ||
    hasDefault ||
    hasDeprecated;

  const toggle = () => {
    if (!hasDetails) return;
    setIsOpen((prev) => !prev);
  };

  const formattedTypeDescription =
    hasTypeDescription && entry.typeDescription
      ? formatTypeSignature(entry.typeDescription.toString())
      : undefined;

  return (
    <>
      <TableRow
        data-state={isOpen ? "selected" : undefined}
        className={cn(hasDetails && "cursor-pointer")}
        onClick={toggle}
        onKeyDown={(event) => {
          if (!hasDetails) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
        tabIndex={hasDetails ? 0 : undefined}
        aria-expanded={hasDetails ? isOpen : undefined}
        role={hasDetails ? "button" : undefined}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {hasDetails && (
              <CaretDownIcon
                aria-hidden
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            )}
            <code className="font-mono text-foreground text-sm">{name}</code>
            {entry.required && (
              <span className="text-destructive text-xs">*</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <code
            className={cn(
              "font-mono text-muted-foreground text-sm",
              entry.deprecated && "line-through",
            )}
          >
            {entry.type}
          </code>
        </TableCell>
      </TableRow>

      {isOpen && hasDetails && (
        <TableRow>
          <TableCell colSpan={2}>
            <div className="space-y-4 py-2">
              <DetailSection label="Name">
                <code className="font-mono text-foreground text-sm">
                  {name}
                </code>
              </DetailSection>

              {hasDescription && entry.description && (
                <DetailSection label="Description">
                  {typeof entry.description === "string" ? (
                    <p className="whitespace-pre-wrap">{entry.description}</p>
                  ) : (
                    entry.description
                  )}
                </DetailSection>
              )}

              {hasTypeDescription && entry.typeDescription && (
                <DetailSection label="Type">
                  <div className="flex items-start gap-2">
                    <CodeBlock
                      className="flex-1"
                      code={formattedTypeDescription ?? ""}
                      language="typescript"
                    />
                    {entry.typeDescriptionLink && (
                      <a
                        href={entry.typeDescriptionLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-xs underline underline-offset-4"
                      >
                        Docs
                      </a>
                    )}
                  </div>
                </DetailSection>
              )}

              {hasParameters && entry.parameters && (
                <DetailSection label="Parameters">
                  <div className="space-y-2">
                    {entry.parameters.map((parameter) => (
                      <div
                        key={parameter.name}
                        className="flex items-start gap-2"
                      >
                        <code className="font-mono text-foreground text-xs">
                          {parameter.name}
                        </code>
                        <span className="text-muted-foreground text-sm">
                          {parameter.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </DetailSection>
              )}

              {hasReturns && entry.returns && (
                <DetailSection label="Returns">
                  <code className="font-mono text-foreground text-sm">
                    {entry.returns}
                  </code>
                </DetailSection>
              )}

              {hasProperties && entry.properties && (
                <DetailSection label="Properties">
                  <PropertyList properties={entry.properties} />
                </DetailSection>
              )}

              {hasDefault && entry.default && (
                <DetailSection label="Default">
                  <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
                    {entry.default}
                  </code>
                </DetailSection>
              )}

              {hasDeprecated && (
                <DetailSection label="Deprecated">
                  <span className="text-destructive text-sm">
                    This field is deprecated.
                  </span>
                </DetailSection>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function TypeTable({ type }: TypeTableProps) {
  const entries = Object.entries(type);

  if (entries.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Prop</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([propertyName, entry]) => (
          <TypeRow key={propertyName} name={propertyName} entry={entry} />
        ))}
      </TableBody>
    </Table>
  );
}
