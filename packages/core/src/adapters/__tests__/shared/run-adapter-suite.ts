import { describe, expect, it } from "vitest";

import type {
  AdapterCountArgs,
  AdapterCreateArgs,
  AdapterDeleteArgs,
  AdapterFindManyArgs,
  AdapterFindOneArgs,
  AdapterUpdateArgs,
  AdapterUpdateManyArgs,
  AdapterUpsertArgs,
  DatabaseAdapterMethods,
} from "../../create-database-adapter";

type AdapterAssertion<T> = (result: T) => void;

interface CrudScenario {
  create: AdapterCreateArgs;
  findOne: AdapterFindOneArgs;
  findMany: AdapterFindManyArgs;
  count: AdapterCountArgs;
  update: AdapterUpdateArgs;
  updateMany: AdapterUpdateManyArgs;
  delete: AdapterDeleteArgs;
  deleteMany: AdapterDeleteArgs;
  upsert?: AdapterUpsertArgs;
}

interface AdapterAssertions {
  create?: AdapterAssertion<unknown>;
  findOne?: AdapterAssertion<unknown | null | undefined>;
  findMany?: AdapterAssertion<unknown[]>;
  count?: AdapterAssertion<number>;
  update?: AdapterAssertion<unknown>;
  updateMany?: AdapterAssertion<number>;
  delete?: AdapterAssertion<unknown>;
  deleteMany?: AdapterAssertion<number>;
  upsert?: AdapterAssertion<unknown>;
}

interface RunAdapterSuiteOptions {
  name: string;
  createAdapter: () => Promise<DatabaseAdapterMethods> | DatabaseAdapterMethods;
  scenario: CrudScenario;
  assertions?: AdapterAssertions;
}

function defaultNonNullAssertion<T>(value: T) {
  expect(value).not.toBeUndefined();
}

export function runAdapterSuite(options: RunAdapterSuiteOptions) {
  describe(`${options.name} shared CRUD suite`, () => {
    it("executes the generic CRUD flow", async () => {
      const methods = await options.createAdapter();

      const created = await methods.create(options.scenario.create);
      (options.assertions?.create ?? defaultNonNullAssertion)(created);

      const fetched = await methods.findOne(options.scenario.findOne);
      (options.assertions?.findOne ?? defaultNonNullAssertion)(fetched);

      const many = await methods.findMany(options.scenario.findMany);
      (
        options.assertions?.findMany ??
        ((value: unknown[]) => expect(Array.isArray(value)).toBe(true))
      )(many);

      const counted = await methods.count(options.scenario.count);
      (
        options.assertions?.count ??
        ((value: number) => expect(typeof value).toBe("number"))
      )(counted);

      const updated = await methods.update(options.scenario.update);
      (options.assertions?.update ?? defaultNonNullAssertion)(updated);

      const updatedMany = await methods.updateMany(options.scenario.updateMany);
      (
        options.assertions?.updateMany ??
        ((value: number) => expect(typeof value).toBe("number"))
      )(updatedMany);

      const deleted = await methods.delete(options.scenario.delete);
      (options.assertions?.delete ?? defaultNonNullAssertion)(deleted);

      const deletedMany = await methods.deleteMany(options.scenario.deleteMany);
      (
        options.assertions?.deleteMany ??
        ((value: number) => expect(typeof value).toBe("number"))
      )(deletedMany);

      if (options.scenario.upsert) {
        const upserted = await methods.upsert(options.scenario.upsert);
        (options.assertions?.upsert ?? defaultNonNullAssertion)(upserted);
      }
    });
  });
}
