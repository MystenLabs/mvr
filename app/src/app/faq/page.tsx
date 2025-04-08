import { PlainPageLayout } from "@/components/layouts/PlainPageLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Text } from "@/components/ui/Text";
import { FAQContent } from "@/data/content";

export default function Faq() {
  return (
    <PlainPageLayout>
      <div className="grid grid-cols-1 gap-xl lg:grid-cols-12 py-lg">
        <div className="lg:col-span-4">
          <Text kind="heading" size="heading-regular">{FAQContent.title}</Text>
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
