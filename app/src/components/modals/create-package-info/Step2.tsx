import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/Text";
import { PackageInfoDisplay } from "@/icons/PackageInfoDisplay";
import { PackageDisplayType } from "@/utils/types";

export function PackageInfoStep2({
  packageAddress,
  display,
  setDisplay,
}: {
  packageAddress: string;
  display: PackageDisplayType;
  setDisplay: (display: PackageDisplayType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-md">
      <PackageInfoDisplay
        {...display}
        packageAddr={packageAddress}
        className="mx-auto"
        width={200}
        height={"auto"}
      />

      <div className="grid flex-grow grid-cols-1 gap-md max-md:text-left">
        <div>
          <Text
            as="label"
            kind="label"
            size="label-small"
            className="block pb-xs"
          >
            Package Info label
          </Text>

          <Input
            value={display.name}
            placeholder="Type a label to easily find your package"
            onChange={(e) => setDisplay({ ...display, name: e.target.value })}
          />
        </div>

        <div>
          <Text
            as="label"
            kind="label"
            size="label-small"
            className="block pb-xs"
          >
            Select style
          </Text>

          <div className="flex flex-wrap gap-xs">
            <ColorPicker
              value={"#" + display.gradientFrom}
              onChange={(color) => {
                setDisplay({
                  ...display,
                  gradientFrom: color.replace("#", ""),
                });
              }}
            />
            <ColorPicker
              value={"#" + display.gradientTo}
              onChange={(color) => {
                setDisplay({ ...display, gradientTo: color.replace("#", "") });
              }}
            />
            <ColorPicker
              value={"#" + display.textColor}
              onChange={(color) => {
                setDisplay({ ...display, textColor: color.replace("#", "") });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
