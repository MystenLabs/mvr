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
            variant="xsmall/medium"
            family="inter"
            color="tertiary"
            className="pb-XSmall uppercase"
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
          "h-32 overflow-y-auto rounded-xl border border-border-classic p-Small",
          !packageModules && "flex items-center justify-center",
        )}
      >
        {packageModules ? (
          <>
            <label>
              <Text
                variant="xsmall/medium"
                family="inter"
                color="tertiary"
                className="pb-XSmall uppercase"
              >
                SELECTED PACKAGE MODULES
              </Text>
            </label>

            {packageModules.map((module) => (
              <Text key={module} variant="small/regular">
                {module}
              </Text>
            ))}
          </>
        ) : (
          <Text variant="small/regular" family="inter" color="tertiary">
            Modules from your selected upgrade cap will be shown here.
          </Text>
        )}
      </div>
    </div>
  );
}
