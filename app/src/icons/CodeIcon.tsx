import { SVGProps } from "react";

const CodeIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.5834 10.4832L1.10059 7.00039L4.5834 3.51758"
        stroke="currentColor"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.416 10.4832L14.8989 7.00039L11.416 3.51758"
        stroke="currentColor"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.05371 12.8378L9.94561 1.16211"
        stroke="currentColor"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CodeIcon;
