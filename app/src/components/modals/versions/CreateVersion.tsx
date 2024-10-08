"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ModalFooter } from "../ModalFooter";
import { GitVersion } from "@/hooks/useVersionsTable";
import { useEffect } from "react";

const formSchema = z.object({
  version: z.coerce.number().positive(),
  repository: z.string().url(),
  path: z.string().optional(),
  tag: z.string(),
});

export default function CreateVersion({
  type = "add",
  closeDialog,
  addUpdate,
  maxVersion,
  taken = [],
}: {
  taken?: (number | string)[];
  type?: "add" | "update" | "delete";
  maxVersion?: number;
  addUpdate: (update: GitVersion) => void;
  closeDialog: () => void;
}) {
  /// Validate the version and do not allow duplicates
  const extraValidations = () => {
    const current = +form.getValues().version;
    if (taken.map((x) => +x).includes(current)) {
      form.setError("version", {
        type: "manual",
        message: "Version has to be unique per package",
      });
    } else if (current > (maxVersion ?? 0)) {
      form.setError("version", {
        type: "manual",
        message: `Version has to be less than or equal to ${maxVersion} (maximum package version)`,
      });
    } else {
      form.clearErrors("version");
      if (!!form.getValues().version) form.trigger("version");
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    mode: "onChange",
    resolver: zodResolver(formSchema),
  });

  const watch = useWatch(form);

  useEffect(() => {
    extraValidations();
  }, [watch, maxVersion]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    addUpdate({
      action: type,
      ...values,
      path: values.path ?? "",
    });

    form.reset();
    closeDialog();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Version</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="py-Regular">
          <div className="grid grid-cols-1 gap-Small">
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your version</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter your version"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="repository"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package's repository</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your repository (e.g. https://github.com/MystenLabs/sui.git)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package's path</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the path in the repository (e.g. crates/sui-framework/packages/sui-framework)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty if the `Move.toml` file is in the root of the
                    repository.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version tag</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter the tag or branch the source code lives in (e.g. framework/mainnet)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Click here to learn more about how to version your package
                    in a re-usable fashion.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ModalFooter
              rightBtnDisabled={!form.formState.isValid}
              rightBtnText="Create Version"
              leftBtnHandler={closeDialog}
            />
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
