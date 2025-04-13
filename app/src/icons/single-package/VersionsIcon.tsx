import { cn } from "@/lib/utils";
import { SVGProps } from "react";

export function VersionsIconUnselected(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="16"
      viewBox="0 0 14 16"
      fill="none"
      {...props}
    >
      <path
        d="M9.65354 3.22356H2.22354C1.63733 3.22356 1.16211 3.69879 1.16211 4.28499V13.8379C1.16211 14.4241 1.63733 14.8993 2.22354 14.8993H9.65354C10.2398 14.8993 10.715 14.4241 10.715 13.8379V4.28499C10.715 3.69879 10.2398 3.22356 9.65354 3.22356Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.28497 6.40785H8.59212"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.28497 9.59213H6.46926"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.87711 1.10071H11.7764C12.0579 1.10071 12.3279 1.21254 12.5269 1.41159C12.7259 1.61065 12.8378 1.88062 12.8378 2.16214V12.2457"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VersionsIconSelected(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="16"
      viewBox="0 0 14 16"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.99997 0C4.52658 0 4.14282 0.383755 4.14282 0.857143C4.14282 1.33053 4.52658 1.71429 4.99997 1.71429H11.8571C11.9329 1.71429 12.0056 1.74439 12.0592 1.79797C12.1128 1.85155 12.1428 1.92423 12.1428 2V12.2857C12.1428 12.7591 12.5266 13.1429 13 13.1429C13.4733 13.1429 13.8571 12.7591 13.8571 12.2857V2C13.8571 1.46957 13.6464 0.960859 13.2713 0.585786C12.8962 0.210714 12.3875 0 11.8571 0H4.99997ZM1.85711 2.85714C0.910331 2.85714 0.142822 3.62465 0.142822 4.57143V14.2857C0.142822 15.2325 0.910331 16 1.85711 16H9.28568C10.2325 16 11 15.2325 11 14.2857V4.57143C11 3.62465 10.2325 2.85714 9.28568 2.85714H1.85711ZM2.99997 6.14286C2.60547 6.14286 2.28568 6.46265 2.28568 6.85714C2.28568 7.25163 2.60547 7.57143 2.99997 7.57143H8.14282C8.53731 7.57143 8.85711 7.25163 8.85711 6.85714C8.85711 6.46265 8.53731 6.14286 8.14282 6.14286H2.99997ZM2.99997 9.57143C2.60547 9.57143 2.28568 9.89122 2.28568 10.2857C2.28568 10.6802 2.60547 11 2.99997 11H5.85711C6.2516 11 6.57139 10.6802 6.57139 10.2857C6.57139 9.89122 6.2516 9.57143 5.85711 9.57143H2.99997Z"
        className="fill-bg-accent"
      />
    </svg>
  );
}
