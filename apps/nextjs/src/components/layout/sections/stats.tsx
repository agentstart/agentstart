"use client";

import { useEffect, useState } from "react";

const stats = [
  {
    label: "Active Developers",
    value: 1000,
    suffix: "+",
    description: "Building with AI agents",
  },
  {
    label: "Token Reduction",
    value: 90,
    suffix: "%",
    description: "Compared to traditional templates",
  },
  {
    label: "Time to Production",
    value: 10,
    suffix: "min",
    description: "From idea to deployment",
  },
  {
    label: "Pre-built Features",
    value: 25,
    suffix: "+",
    description: "Ready to use components",
  },
];

const Counter = ({ value, suffix }: { value: number; suffix: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const increment = value / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="text-4xl sm:text-5xl font-bold text-primary">
      {count}{suffix}
    </span>
  );
};

export const StatsSection = () => {
  return (
    <section className="relative py-24 sm:py-32">
      
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group relative text-center"
              >
                
                <div className="space-y-2">
                  <Counter value={stat.value} suffix={stat.suffix} />
                  <p className="text-lg font-semibold">{stat.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};