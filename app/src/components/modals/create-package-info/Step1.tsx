import { ComboBox } from "@/components/ui/combobox";
import { Text } from "@/components/ui/Text";
import { usePackageModules } from "@/hooks/usePackageModules";
import { cn } from "@/lib/utils";

export function PackageInfoStep1({
  selectedPackage,
  setSelectedPackage,
  availableUpgradeCaps,
}: {
  selectedPackage: string | null;
  setSelectedPackage: (upgradeCap: string) => void;
  availableUpgradeCaps: { label: string; value: string, search?: string }[];
}) {
  const { data: packageModules } = usePackageModules(selectedPackage ?? "");

  return (
    <div className="grid grid-cols-1 gap-Regular">
      <div>
        <label>
          <Text
            as="div"
            kind="label"
            size="label-small"
            className="pb-xs"
          >
            Select Upgrade Cap
          </Text>
        </label>
        <ComboBox
          searchText="Paste your ID here..."
          placeholder="Select an upgrade cap..."
          value={selectedPackage}
          setValue={setSelectedPackage}
          options={availableUpgradeCaps}
        />
      </div>

      <div
        className={cn(
          "h-32 overflow-y-auto rounded-md border border-stroke-secondary p-sm mt-sm",
          !packageModules && "flex items-center justify-center",
        )}
      >
        {packageModules ? (
          <>
            <label>
              <Text
                kind="heading"
                size="heading-headline"
                className="uppercase text-content-tertiary"
              >
                SELECTED PACKAGE MODULES
              </Text>
            </label>

            {packageModules.map((module) => (
              <Text as="p" key={module} kind="paragraph" size="paragraph-regular">
                {module}
              </Text>
            ))}
          </>
        ) : (
          <Text kind="paragraph" size="paragraph-regular" className="text-content-tertiary">
            Modules from your selected upgrade cap will be shown here.
          </Text>
        )}
      </div>
    </div>
  );
}
