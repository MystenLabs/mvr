import { PlainPageLayout } from "@/components/layouts/PlainPageLayout";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import { type Metadata } from "next";

// Placeholder page: keep it out of search indexes until it has real content.
export const metadata: Metadata = {
  title: Content.seo.privacyPolicy.title,
  robots: { index: false, follow: true },
};

export default function PrivacyPolicy() {
  return (
    <PlainPageLayout>
      <Text kind="heading" size="heading-regular">
        Privacy Policy would go here!
      </Text>
    </PlainPageLayout>
  );
}
