import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emptyWizard, type WizardInput } from "./validation";

type WizardState = {
  step: number;
  data: WizardInput;
  /** Id of the saved idea being edited; submitting then saves a new version of it. */
  basedOn: string | null;
  setStep: (step: number) => void;
  patch: (partial: Partial<WizardInput>) => void;
  reset: () => void;
  /** Loads a saved idea into the wizard to edit it and run a new version. */
  loadForEdit: (startupId: string, data: WizardInput) => void;
};

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      step: 1,
      data: emptyWizard(),
      basedOn: null,
      setStep: (step) => set({ step }),
      patch: (partial) => set((s) => ({ data: { ...s.data, ...partial } })),
      reset: () => set({ step: 1, data: emptyWizard(), basedOn: null }),
      loadForEdit: (startupId, data) => set({ step: 1, data, basedOn: startupId }),
    }),
    { name: "idea-validator-wizard" },
  ),
);
