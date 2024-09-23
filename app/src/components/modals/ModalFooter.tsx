import { Button } from "../ui/button";
import { Text } from "../ui/Text";

export function ModalFooter({
  leftBtnText = "Cancel",
  rightBtnText = "Create",
  loading = false,
  leftBtnHandler,
  rightBtnHandler,
  rightBtnType = "submit"
}: {
  loading?: boolean;
  leftBtnText?: string;
  rightBtnText?: string;
  leftBtnHandler?: (...args: any[]) => void;
  rightBtnHandler?: (...args: any[]) => void;
  rightBtnType?: "submit" | "button";
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
        type="submit"
        variant="default"
        className="max-md:order-1"
        isLoading={loading}
        onClick={rightBtnHandler}
      >
        <Text variant="small/regular" family="inter">
          {rightBtnText}
        </Text>
      </Button>
    </div>
  );
}
