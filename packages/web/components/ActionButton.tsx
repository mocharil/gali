"use client";

import { Button, type ButtonProps } from "./ui/button";
import { useActionFeedback } from "@/lib/useActionFeedback";

type Props = Omit<ButtonProps, "onClick" | "loading" | "asChild"> & {
  action: () => unknown | Promise<unknown>;
  loadingText: string;
  paintFirst?: boolean;
};

export function ActionButton({ action, loadingText, paintFirst = false, ...props }: Props) {
  const { busy, error, run } = useActionFeedback();
  return <>
    <Button {...props} type={props.type ?? "button"} loading={busy} loadingText={loadingText} onClick={() => void run(loadingText, action, paintFirst)} />
    {error && <span role="alert" className="block text-[12px] text-negative">This action could not be completed. Try again.</span>}
  </>;
}
