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
    <div className="grid gap-Small pt-Regular md:grid-cols-2">
      <Button
        type="reset"
        variant="tertiary"
        onClick={leftBtnHandler}
        className="max-md:order-2"
      >
        <Text variant="small/regular" family="inter">
          {leftBtnText}
        </Text>
      </Button>

      <Button
        type={rightBtnType}
        variant="default"
        className="max-md:order-1"
        isLoading={loading}
        disabled={rightBtnDisabled}
        onClick={rightBtnHandler}
      >
        <Text variant="small/regular" family="inter">
          {rightBtnText}
        </Text>
      </Button>
    </div>
  );
}
