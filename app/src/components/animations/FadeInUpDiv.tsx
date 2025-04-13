import { ComponentPropsWithRef } from "react";
import { motion, MotionProps } from "framer-motion";

type FadeInUpDivProps = ComponentPropsWithRef<"div"> &
  MotionProps & {
    delay?: number;
    duration?: number;
    initialY?: number;
    initialX?: number;
  };

export function FadeInUpDiv({
  children,
  delay,
  duration,
  initialY,
  initialX,
  ...props
}: FadeInUpDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: initialY ?? 300, x: initialX ?? 0 }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: duration || 1, delay, type: "easeInOut" }}
      viewport={{ once: true }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
