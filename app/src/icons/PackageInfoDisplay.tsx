import { PackageDisplayType } from "@/hooks/useGetPackageInfoObjects";
import { formatAddress, normalizeSuiAddress } from "@mysten/sui/utils";
import type { SVGProps } from "react";

export const PackageInfoDisplay = (props: SVGProps<SVGSVGElement> & PackageDisplayType & {
    packageAddr?: string;
}) => (
  <svg
    key={JSON.stringify(props)}
    width={props.width ?? "500"}
    height={props.height ?? "500"}
    viewBox="0 0 500 500"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clip-path="url(#clip0_6_2)">
      <path
        d="M0 16.6667C0 7.46194 7.46192 0 16.6667 0H483.333C492.537 0 500 7.46192 500 16.6667V483.333C500 492.537 492.537 500 483.333 500H16.6667C7.46194 500 0 492.537 0 483.333V16.6667Z"
        fill={`url(#background_gradient_${props.packageAddr})`}
      />
      <path
        d="M195.904 524.733C186.465 519.521 183.506 513.885 183.506 503.883V378.221C183.506 372.727 186.888 368.923 191.677 366.248L307.9 302.148C316.212 297.5 326.073 297.5 334.385 302.148L450.748 366.248C455.398 368.923 458.779 372.727 458.779 378.221V503.883C458.779 513.885 455.821 519.521 446.381 524.733L330.158 587.846C323.819 591.227 318.325 591.085 312.267 587.846L195.904 524.733ZM390.877 405.129L449.481 373.292L328.89 306.938C323.96 304.121 318.325 304.121 313.394 306.938L261.692 335.396L390.877 405.129ZM321.142 442.744L383.55 408.933L254.367 339.34L192.804 373.292L321.142 442.744ZM202.525 520.506L317.479 582.21V448.66L191.114 380.475V503.179C191.114 511.35 192.382 515.013 202.525 520.506ZM439.76 520.506C449.904 515.013 451.171 511.35 451.171 503.179V380.475L324.804 448.66V582.21L439.76 520.506Z"
        fill={`#${props.textColor}`}
        fill-opacity="0.5"
      />
      <foreignObject x="40" y="30" width="420" height="300">
        <p className="text-[32px]" style={{color: `#${props.textColor}`, fontFamily: 'monospace'}}>
            {props.name}
        </p>
        <p className="font-mono text-[22px] opacity-60" style={{color: `#${props.textColor}`}}>
            {formatAddress(props.packageAddr ?? normalizeSuiAddress('0x2'))}
        </p>
    </foreignObject>
    </g>
    <defs>
      <linearGradient
        id={`background_gradient_${props.packageAddr}`}
        x1="166.667"
        y1="4.76009e-06"
        x2="250"
        y2="500"
        gradientUnits="userSpaceOnUse"
      >
        <stop style={{
          stopColor: `#${props.gradientFrom}`,
        }} />
        <stop offset="1"
        style={{
          stopColor: `#${props.gradientTo}`,
        }} />
      </linearGradient>
      <clipPath id="clip0_6_2">
        <rect width="500" height="500" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
