import * as React from "react"
import { SVGProps } from "react"
const SocialYoutube = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={32}
    height={32}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <g clipPath="url(#a)">
      <path
        fill="#91A3B1"
        fillRule="evenodd"
        d="M12 24c6.628 0 12-5.372 12-12 0-6.627-5.372-12-12-12C5.373 0 0 5.373 0 12c0 6.628 5.373 12 12 12Zm-2.685-7.048 2.883.052c.004 0 .014 0 .014.007 1.605.03 3.17-.064 4.77-.18 1.278-.09 1.58-1.015 1.739-2.118.197-1.333.24-2.682.137-4.024l-.014-.192c-.097-1.284-.204-2.727-1.724-2.993a6.755 6.755 0 0 0-.982-.117c-3.105-.1-6.238-.125-9.35.09-.922.06-1.518.604-1.67 1.518a19.918 19.918 0 0 0-.176 5.001c.102 1.155.22 2.505 1.589 2.784.736.153 1.486.159 2.238.165.182.002.364.003.546.007Zm2.684-3.6-1.496.859v-4.117l1.653.948c.642.369 1.285.738 1.936 1.11L12 13.352Z"
        clipRule="evenodd"
      />
    </g>
    <defs>
      <clipPath id="a">
        <path fill="#fff" d="M0 0h24v24H0z" />
      </clipPath>
    </defs>
  </svg>
)
export default SocialYoutube
