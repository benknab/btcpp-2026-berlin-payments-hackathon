import { useAction } from "@/components/use-action";
import type { ExpenseView } from "@/db/expenses";
import { NewExpense } from "@/domain/expense-input";
import { expenseDraft, saveExpense, updateExpense } from "@/server/expenses";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Schema } from "effect";
import { useState } from "react";

export interface ExpenseFormOptions {
  readonly inviteKey: string;
  readonly id: string;
  readonly date: string;
  readonly payerId: string;
  readonly existing: ExpenseView | null;
}
export interface ExpenseFormValues {
  readonly id: string;
  readonly payerId: string;
  readonly description: string;
  readonly amount: string;
  readonly date: string;
}
export interface ExpenseFormState {
  readonly values: ExpenseFormValues;
  readonly pending: boolean;
  readonly error: string | null;
  readonly success: string | null;
  readonly change: (field: keyof ExpenseFormValues, value: string) => void;
  readonly handleSubmit: (event: { readonly preventDefault: () => void }) => void;
}

function initialValues(options: ExpenseFormOptions): ExpenseFormValues {
  return {
    id: options.id,
    payerId: options.payerId,
    date: options.date,
    description: options.existing?.description ?? "",
    amount: options.existing === null ? "" : String(options.existing.amountSats),
  };
}

export function useExpenseForm(options: ExpenseFormOptions): ExpenseFormState {
  const action = useAction();
  const router = useRouter();
  const navigate = useNavigate();
  const [values, setValues] = useState(() => initialValues(options));
  const [validation, setValidation] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function change(field: keyof ExpenseFormValues, value: string): void {
    setValues({ ...values, [field]: value });
    setSuccess(null);
    setValidation(null);
  }
  function handleSubmit(event: { readonly preventDefault: () => void }): void {
    event.preventDefault();
    const data = {
      inviteKey: options.inviteKey,
      expenseId: values.id,
      payerId: values.payerId,
      description: values.description.trim(),
      amountSats: Number(values.amount),
      date: values.date,
    };
    if (!Schema.is(NewExpense)(data)) {
      setValidation("Choose a payer, add a description, and enter positive whole sats and a valid date.");
      return;
    }
    setValidation(null);
    setSuccess(null);
    action.run(async (): Promise<void> => {
      if (options.existing !== null) {
        await updateExpense({ data: { ...data, version: options.existing.version } });
        await router.invalidate();
        await navigate({
          to: "/groups/$inviteKey/expenses/$expenseId",
          params: { inviteKey: options.inviteKey, expenseId: values.id },
        });
        return;
      }
      await saveExpense({ data });
      const next = await expenseDraft();
      await router.invalidate();
      setValues({ ...values, id: next.id, description: "", amount: "" });
      setSuccess(`Added ${data.description}. Ready for the next one.`);
    }, "Could not save. Check your connection; refresh if someone edited this expense or settlement started.");
  }
  return { values, pending: action.pending, error: validation ?? action.error, success, change, handleSubmit };
}
