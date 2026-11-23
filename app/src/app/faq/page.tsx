import { PlainPageLayout } from "@/components/layouts/PlainPageLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Text } from "@/components/ui/Text";
import { Content, FAQContent } from "@/data/content";
import { JsonLd } from "@/components/JsonLd";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: Content.seo.faq.title,
  description: Content.seo.faq.description,
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    siteName: Content.seo.siteName,
    title: `${Content.seo.faq.title} | ${Content.seo.siteName}`,
    description: Content.seo.faq.description,
    url: "/faq",
  },
  twitter: {
    card: "summary",
    title: `${Content.seo.faq.title} | ${Content.seo.siteName}`,
    description: Content.seo.faq.description,
  },
};

// The answers are collapsed (not in the DOM) until opened, so we also expose
// them as structured data, which is part of the server-rendered HTML.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQContent.items.map((item) => ({
    "@type": "Question",
    name: item.title.trim(),
    acceptedAnswer: {
      "@type": "Answer",
      text: item.content.replace(/\s+/g, " ").trim(),
    },
  })),
};

export default function Faq() {
  return (
    <PlainPageLayout>
      <JsonLd data={faqJsonLd} />
      <div className="grid grid-cols-1 gap-xl lg:grid-cols-12 py-lg">
        <div className="lg:col-span-4">
          <Text as="h1" kind="heading" size="heading-regular">{FAQContent.title}</Text>
          <Text kind="paragraph" size="paragraph-small" className="pt-Regular">{FAQContent.content}</Text>
        </div>
        <div className="lg:col-span-8">
          <Accordion type="single" collapsible>
            {FAQContent.items.map((item, index) => (
              <AccordionItem key={index} value={item.title + index}>
                <AccordionTrigger>{item.title}</AccordionTrigger>
                <AccordionContent >
                  <div dangerouslySetInnerHTML={{ __html: item.content }} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </PlainPageLayout>
  );
}
