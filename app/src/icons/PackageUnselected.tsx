import { SVGProps } from "react";

const PackageUnselected = (props: SVGProps<SVGSVGElement>) => {
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
        d="M8 1.63184V5.55096"
        stroke="currentColor"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.46973 11.6543H11.5925"
        stroke="currentColor"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.63184 5.55078H14.369V13.389C14.369 13.6488 14.2657 13.8981 14.082 14.0818C13.8982 14.2655 13.649 14.3688 13.3892 14.3688H2.61162C2.35176 14.3688 2.10255 14.2655 1.9188 14.0818C1.73506 13.8981 1.63184 13.6488 1.63184 13.389V5.55078Z"
        stroke="currentColor"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.20172 2.23867C3.37737 1.86808 3.75078 1.63184 4.16087 1.63184H11.8399C12.25 1.63184 12.6235 1.86808 12.7991 2.23867L14.369 5.55096H1.63184L3.20172 2.23867Z"
        stroke="currentColor"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PackageUnselected;
