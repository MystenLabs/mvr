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
    <div className="grid gap-s pt-m md:grid-cols-2">
      <Button
        type="reset"
        variant="tertiary"
        onClick={leftBtnHandler}
        className="max-md:order-2"
      >
        <Text kind="label" size="label-regular">
          {leftBtnText}
        </Text>
      </Button>

      <Button
        type={rightBtnType}
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
