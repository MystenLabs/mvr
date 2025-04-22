import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "../ui/dialog";
import { DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { PackageInfoData } from "@/utils/types";
import { z } from "zod";
import { isValidSuiAddress, isValidSuiNSName } from "@mysten/sui/utils";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDebounce } from "@/hooks/useDebounce";
import { usePackagesNetwork } from "../providers/packages-provider";
import { useResolveSuiNSName } from "@mysten/dapp-kit";
import { useSuiNSResolution } from "@/hooks/useSuiNSResolution";
import {
  Form,
  FormLabel,
  FormControl,
  FormMessage,
  FormItem,
  FormField,
} from "../ui/form";
import { Input } from "../ui/input";
import { Text } from "../ui/Text";
import { beautifySuiAddress } from "@/lib/utils";
import { CopyBtn } from "../ui/CopyBtn";
import { useEffect, useMemo } from "react";
import { PackageInfo } from "@/data/package-info";
import { Transaction } from "@mysten/sui/transactions";
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
import { toast } from "sonner";

const isSuiNSLike = (address: string) => {
  return address?.includes(".") || address?.includes("@");
};

const formSchema = z
  .object({
    recipient: z.string(),
  })
  .refine(
    (data) => {
      if (isSuiNSLike(data.recipient)) return isValidSuiNSName(data.recipient);

      if (isValidSuiAddress(data.recipient)) return true;

      return false;
    },
    {
      message:
        "Invalid recipient. Recipient must be a valid Sui address or SuiNS name.",
      path: ["recipient"],
    },
  );
export function TransferMetadataDialog({
  packageInfo,
  showDialog,
  setShowDialog,
  onTransfer,
}: {
  packageInfo: PackageInfoData;
  showDialog: boolean;
  setShowDialog: (showDialog: boolean) => void;
  onTransfer: () => void;
}) {
  const network = usePackagesNetwork();

  const { executeTransaction } = useTransactionExecution(
    network as "mainnet" | "testnet",
  );

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onChange",
    resolver: zodResolver(formSchema),
  });

  const recipient = useWatch({ control: form.control, name: "recipient" });
  const { value: debouncedRecipient, isDebouncing } = useDebounce(
    recipient,
    200,
  );

  const { data: address, isLoading } = useSuiNSResolution(
    debouncedRecipient,
    network,
  );

  const isValidRecipient = useMemo(() => {
    if (isSuiNSLike(debouncedRecipient)) {
      return !!address && isValidSuiAddress(address);
    }

    return isValidSuiAddress(debouncedRecipient);
  }, [debouncedRecipient, address]);

  useEffect(() => {
    if (isLoading) return;
    if (!debouncedRecipient) {
      form.clearErrors("recipient");
      return;
    }

    if (isSuiNSLike(debouncedRecipient)) {
      if (!address) {
        form.setError("recipient", {
          message: `Resolution was not successful for ${debouncedRecipient}. It's either an invalid SuiNS name or it does not point to a valid Sui address.`,
        });
      } else {
        form.clearErrors("recipient");
      }
      return;
    }

    if (!isValidSuiAddress(debouncedRecipient)) {
      form.setError("recipient", {
        message: `Invalid recipient. Recipient must be a valid Sui address.`,
      });
    } else {
      form.clearErrors("recipient");
    }
  }, [debouncedRecipient, address, isLoading]);

  const transfer = async () => {
    if (!isValidRecipient) throw new Error("Invalid recipient");
    const transaction = new Transaction();

    const pkgInfo = new PackageInfo(transaction, packageInfo.objectId);

    const recipient = isSuiNSLike(debouncedRecipient)
      ? address
      : debouncedRecipient;

    if (!recipient) throw new Error("Invalid recipient");

    pkgInfo.transfer({
      to: transaction.pure.address(recipient),
    });

    const res = await executeTransaction(transaction);

    if (!res || res.effects?.status?.status !== "success") return;

    toast.success("Metadata transferred successfully");
    onTransfer();
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-sm w-full">
            Transfer Metadata
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Metadata</DialogTitle>
            <DialogDescription>
              Transfer the metadata of the package to a new address.{" "}
              <strong>Use with caution</strong> as this action is irreversible.
            </DialogDescription>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(transfer)}
                className="grid grid-cols-1 gap-md pt-md"
              >
                <FormField
                  control={form.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Recipient (address or SuiNS name)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          hasError={!!form.formState.errors.recipient}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {address && isSuiNSLike(debouncedRecipient) && (
                  <div className="mt-md flex items-center gap-xs">
                    <Text as="div" kind="paragraph" size="paragraph-small">
                      The SuiNS name resolves to{" "}
                      <span className="font-medium">
                        {beautifySuiAddress(address)}
                      </span>
                    </Text>
                    <CopyBtn text={address} />
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={!isValidRecipient || isDebouncing || isLoading}
                  isLoading={
                    isDebouncing || isLoading || form.formState.isSubmitting
                  }
                  size="lg"
                >
                  Transfer Metadata
                </Button>
              </form>
            </Form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
