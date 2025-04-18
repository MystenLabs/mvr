import { cn } from "@/lib/utils";
import { SVGProps } from "react";

export function AnalyticsIconUnselected(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      {...props}
    >
      <path
        d="M12.3892 0.631409H1.61162C1.0705 0.631409 0.631836 1.07008 0.631836 1.61119V12.3887C0.631836 12.9299 1.0705 13.3686 1.61162 13.3686H12.3892C12.9303 13.3686 13.369 12.9299 13.369 12.3887V1.61119C13.369 1.07008 12.9303 0.631409 12.3892 0.631409Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.75488 7.5307V10.715H5.67381V7.5307H2.75488Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.67383 5.40784V10.715H8.3274V5.40784H5.67383Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.32715 3.28497V10.715H11.2461V3.28497H8.32715Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AnalyticsIconSelected(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.571411 2.19779C0.571411 1.29956 1.29956 0.571411 2.19779 0.571411H13.8022C14.7004 0.571411 15.4286 1.29956 15.4286 2.19779V13.8022C15.4286 14.7004 14.7004 15.4286 13.8022 15.4286H2.19779C1.29956 15.4286 0.571411 14.7004 0.571411 13.8022V2.19779ZM11.1428 12.5714C10.8273 12.5714 10.5714 12.3155 10.5714 12V3.99998C10.5714 3.68439 10.8273 3.42855 11.1428 3.42855H12.8571C13.1727 3.42855 13.4286 3.68439 13.4286 3.99998V12C13.4286 12.3155 13.1727 12.5714 12.8571 12.5714H11.1428ZM6.57141 6.2857V12C6.57141 12.3155 6.82725 12.5714 7.14284 12.5714H8.85713C9.17271 12.5714 9.42855 12.3155 9.42855 12V6.2857C9.42855 5.97011 9.17271 5.71427 8.85713 5.71427H7.14284C6.82725 5.71427 6.57141 5.97011 6.57141 6.2857ZM2.57141 12V8.57141C2.57141 8.25582 2.82725 7.99998 3.14284 7.99998H4.85713C5.17271 7.99998 5.42855 8.25582 5.42855 8.57141V12C5.42855 12.3155 5.17271 12.5714 4.85713 12.5714H3.14284C2.82725 12.5714 2.57141 12.3155 2.57141 12Z"
        className="fill-bg-accent"
      />
    </svg>
  );
}
