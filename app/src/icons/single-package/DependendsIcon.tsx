import { cn } from "@/lib/utils";
import { SVGProps } from "react";

export function DependendsIconUnselected(props: SVGProps<SVGSVGElement>) {
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
        d="M11.7764 9.59214H6.99997C6.41376 9.59214 5.93854 9.11692 5.93854 8.53071V7.46928C5.93854 6.88307 6.41376 6.40785 6.99997 6.40785H11.7764C12.3626 6.40785 12.8378 6.88306 12.8378 7.46928V8.53071C12.8378 9.11692 12.3626 9.59214 11.7764 9.59214Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.7764 4.28499H6.99997C6.41376 4.28499 5.93854 3.80977 5.93854 3.22357V2.16214C5.93854 1.57593 6.41376 1.10071 6.99997 1.10071H11.7764C12.3626 1.10071 12.8378 1.57593 12.8378 2.16214V3.22357C12.8378 3.80977 12.3626 4.28499 11.7764 4.28499Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.7764 14.8993H6.99997C6.41376 14.8993 5.93854 14.4241 5.93854 13.8379V12.7764C5.93854 12.1902 6.41376 11.715 6.99997 11.715H11.7764C12.3626 11.715 12.8378 12.1902 12.8378 12.7764V13.8379C12.8378 14.4241 12.3626 14.8993 11.7764 14.8993Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.16211 7.99999H5.93854"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.16211 2.69285H5.93854"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.93854 13.3071H2.22354C1.63733 13.3071 1.16211 12.8319 1.16211 12.2457V1.10071"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DependendsIconSelected(props: SVGProps<SVGSVGElement>) {
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
        d="M1.85711 1.42857H5.30938C5.44541 0.617797 6.15054 0 6.99997 0H12.1428C13.0896 0 13.8571 0.767511 13.8571 1.71429V2.85714C13.8571 3.80392 13.0896 4.57143 12.1428 4.57143H6.99997C6.15054 4.57143 5.44541 3.95363 5.30938 3.14286H1.85711V7.14286H5.30938C5.44541 6.33208 6.15054 5.71429 6.99997 5.71429H12.1428C13.0896 5.71429 13.8571 6.48179 13.8571 7.42857V8.57143C13.8571 9.51821 13.0896 10.2857 12.1428 10.2857H6.99997C6.15054 10.2857 5.44541 9.66792 5.30938 8.85714H1.85711V12.5714C1.85711 12.7293 1.98503 12.8571 2.14282 12.8571H5.30938C5.44541 12.0464 6.15054 11.4286 6.99997 11.4286H12.1428C13.0896 11.4286 13.8571 12.1961 13.8571 13.1429V14.2857C13.8571 15.2325 13.0896 16 12.1428 16H6.99997C6.15054 16 5.44541 15.3822 5.30938 14.5714H2.14282C1.03825 14.5714 0.142822 13.676 0.142822 12.5714V0.857143C0.142822 0.383755 0.526582 0 0.999965 0C1.47335 0 1.85711 0.383755 1.85711 0.857143V1.42857Z"
        className="fill-bg-accent"
      />
    </svg>
  );
}
