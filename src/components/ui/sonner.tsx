import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "bg-card text-card-foreground border-border shadow-lg",
        },
      }}
    />
  );
}
