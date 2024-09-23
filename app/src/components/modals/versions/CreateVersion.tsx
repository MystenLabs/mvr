"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { usePackagesNetwork } from "../../providers/packages-provider";
import { Text } from "../../ui/Text";
import { Button } from "../../ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
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

const formSchema = z.object({
  version: z.coerce.number().positive(),
  repository: z.string().url(),
  path: z.string().optional(),
  tag: z.string(),
});

export default function CreateVersion({
  closeDialog,
}: {
  closeDialog: () => void;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
    alert(values);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Version</DialogTitle>
        <DialogDescription>
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
                        Leave empty if the `Move.toml` file is in the root of
                        the repository.
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
                        Click here to learn more about how to version your
                        package in a re-usable fashion.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ModalFooter
                  rightBtnText="Create Version"
                  leftBtnHandler={closeDialog}
                />
              </div>
            </form>
          </Form>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  );
}