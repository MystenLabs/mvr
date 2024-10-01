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
      <div className="grid grid-cols-1 gap-XLarge lg:grid-cols-12 py-Large">
        <div className="lg:col-span-4">
          <Text variant="heading/bold">{FAQContent.title}</Text>
          <Text variant="small/regular" className="pt-Regular">{FAQContent.content}</Text>
        </div>
        <div className="lg:col-span-8">
          <Accordion type="single" collapsible>
            {FAQContent.items.map((item, index) => (
              <AccordionItem key={index} value={item.title + index}>
                <AccordionTrigger>{item.title}</AccordionTrigger>
                <AccordionContent>{item.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </PlainPageLayout>
  );
}
