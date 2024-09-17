import * as React from "react"
import { SVGProps } from "react"
const SocialX = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={32}
    height={32}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <circle cx={12} cy={12} r={12} fill="#91A3B1" />
    <path
      fill="#030F1C"
      d="m13.206 11.347 4.029-4.583h-.955l-3.499 3.98-2.794-3.98H6.764l4.226 6.018-4.226 4.805h.955l3.695-4.202 2.95 4.202h3.223l-4.382-6.24Zm-1.308 1.488-.428-.6-3.407-4.767H9.53l2.749 3.847.428.6 3.573 5.001h-1.466l-2.916-4.081Z"
    />
  </svg>
)
export default SocialX
