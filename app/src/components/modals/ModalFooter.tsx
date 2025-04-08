import { Button } from "../ui/button";
import { Text } from "../ui/Text";

export function ModalFooter({
  leftBtnText = "Cancel",
  rightBtnText = "Create",
  loading = false,
  leftBtnHandler,
  rightBtnHandler,
  rightBtnType = "submit",
  rightBtnDisabled = false
}: {
  loading?: boolean;
  leftBtnText?: string;
  rightBtnText?: string;
  leftBtnHandler?: (...args: any[]) => void;
  rightBtnHandler?: (...args: any[]) => void;
  rightBtnType?: "submit" | "button";
  rightBtnDisabled?: boolean;
}) {
  return (
    <div className="grid gap-sm md:grid-cols-2">
      <Button
        type="reset"
        size="auto"
        variant="secondary"
        onClick={leftBtnHandler}
        className="max-md:order-2"
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
