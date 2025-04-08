import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Text } from "../ui/Text";

export function ModalFooter({
  leftBtnText = "Cancel",
  rightBtnText = "Create",
  loading = false,
  leftBtnHandler,
  rightBtnHandler,
  rightBtnType = "submit",
  rightBtnDisabled = false,
  leftBtnDisabled = false,
  alignLeft,
}: {
  loading?: boolean;
  leftBtnText?: string;
  rightBtnText?: string;
  leftBtnHandler?: (...args: any[]) => void;
  rightBtnHandler?: (...args: any[]) => void;
  rightBtnType?: "submit" | "button";
  rightBtnDisabled?: boolean;
  leftBtnDisabled?: boolean;
  className?: string;
  alignLeft?: boolean;
}) {
  return (
    <div className={alignLeft ? "flex flex-row justify-end flex-grow items-center gap-sm" : "grid gap-sm md:grid-cols-2"}>
      <Button
        type="reset"
        size="auto"
        variant="secondary"
        onClick={leftBtnHandler}
        className="max-md:order-2"
        disabled={leftBtnDisabled}
      >
        <Text kind="label" size="label-regular">
          {leftBtnText}
        </Text>
      </Button>

      <Button
        type={rightBtnType}
        size="auto"
        className="max-md:order-1"
        isLoading={loading}
        disabled={rightBtnDisabled}
        onClick={rightBtnHandler}
      >
        <Text kind="label" size="label-regular">
          {rightBtnText}
        </Text>
      </Button>
    </div>
  );
}
