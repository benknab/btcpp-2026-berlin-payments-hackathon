import { Schema } from "effect";

import { EntityId, InviteKey, MainnetAddress } from "./group-input";

export const MAX_DEMO_TOTAL_SATS = 1000;
export const DemoPresetIdSchema = Schema.Literals(["coffee", "dinner", "weekend"]);
export type DemoPresetId = typeof DemoPresetIdSchema.Type;

export const DEMO_PEOPLE = [
  {
    name: "Vini",
    address:
      "lno1pgqppmsrse80qf0aara4slvcjxrvu6j2rp5ftmjy4yntlsmsutpkvkt6878s92juheuke8gfn06hgtwrcfruznr8qs3mx9w32wre4e42kn4z7gnxqgp69syxm6lr30cq3emlrjcnp5ksw9aayuzj0wwcl8xmzumfmm0h52sqxw06zuc6t852xy7prux9rtth8c6kal8yc2thkt448lqsr4eedels6xkz59fxued34cxdg8kf8rxgu3gy58ds8y2nu962suf5xg4s8jwfzasr4wka59zt84fkfpkf09uhwpsy8xu7qqedcdp7wtn9nswxj907x5aex2z8f0qw5gjavhqyrrhlya8mup8t3cca8wcywxxrx6zf7lvpeqjusszpfnzq",
  },
  { name: "Ben", address: "bk@breez.tips" },
  { name: "Dingo", address: "denimdingo16@primal.net" },
  { name: "MintMonkey", address: "mintmonkey6303@breez.tips" },
];

interface DemoExpense {
  readonly payer: string;
  readonly description: string;
  readonly amountSats: number;
}

export interface DemoPreset {
  readonly id: DemoPresetId;
  readonly name: string;
  readonly expenses: readonly DemoExpense[];
}

export const DEMO_PRESETS: readonly DemoPreset[] = [
  { id: "coffee", name: "Coffee", expenses: [{ payer: "Ben", description: "Coffee", amountSats: 200 }] },
  {
    id: "dinner",
    name: "Dinner",
    expenses: [
      { payer: "Ben", description: "Dinner", amountSats: 200 },
      { payer: "Dingo", description: "Drinks", amountSats: 100 },
    ],
  },
  {
    id: "weekend",
    name: "Berlin weekend",
    expenses: [
      { payer: "Vini", description: "Dinner", amountSats: 300 },
      { payer: "Ben", description: "Coffee", amountSats: 100 },
      { payer: "Dingo", description: "Transport", amountSats: 60 },
      { payer: "MintMonkey", description: "Snacks", amountSats: 40 },
    ],
  },
];

export function demoTotal(preset: DemoPreset): number {
  return preset.expenses.reduce((total, expense) => total + expense.amountSats, 0);
}

export const CreateDemoEvent = Schema.Struct({
  presetId: DemoPresetIdSchema,
  requestKey: InviteKey,
  arkAddress: MainnetAddress,
});

export const PendingDemoEventSchema = Schema.Struct({
  presetId: DemoPresetIdSchema,
  requestKey: InviteKey,
  walletId: EntityId,
});
export type PendingDemoEvent = typeof PendingDemoEventSchema.Type;

export const SavedDemoEventSchema = Schema.Struct({
  ...PendingDemoEventSchema.fields,
  inviteKey: InviteKey,
  arkAddress: MainnetAddress,
});
export type SavedDemoEvent = typeof SavedDemoEventSchema.Type;
