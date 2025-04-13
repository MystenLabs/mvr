import { SVGProps } from "react";

const GlowBottomPart = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="1440"
      height="2097"
      viewBox="0 0 1440 2097"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g opacity="0.4" filter="url(#filter0_f_2056_11951)">
        <circle
          cx="572.498"
          cy="572.498"
          r="572.498"
          transform="matrix(1 0 0 -1 147.504 1280)"
          fill="url(#paint0_linear_2056_11951)"
          fillOpacity="0.34"
        />
        <circle
          cx="572.498"
          cy="572.498"
          r="572.498"
          transform="matrix(1 0 0 -1 147.504 1280)"
          fill="url(#paint1_linear_2056_11951)"
        />
      </g>
      <g filter="url(#filter1_f_2056_11951)">
        <ellipse
          cx="493"
          cy="492.5"
          rx="493"
          ry="492.5"
          transform="matrix(1 0 0 -1 227 2374.33)"
          fill="url(#paint2_linear_2056_11951)"
          fillOpacity="0.34"
        />
        <ellipse
          cx="493"
          cy="492.5"
          rx="493"
          ry="492.5"
          transform="matrix(1 0 0 -1 227 2374.33)"
          fill="url(#paint3_linear_2056_11951)"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_2056_11951"
          x="-310.796"
          y="-323.295"
          width="2061.6"
          height="2061.6"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="229.15"
            result="effect1_foregroundBlur_2056_11951"
          />
        </filter>
        <filter
          id="filter1_f_2056_11951"
          x="-231.3"
          y="931.034"
          width="1902.6"
          height="1901.6"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="229.15"
            result="effect1_foregroundBlur_2056_11951"
          />
        </filter>
        <linearGradient
          id="paint0_linear_2056_11951"
          x1="0"
          y1="0"
          x2="1145"
          y2="1145"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF0099" />
          <stop offset="1" stopColor="#FFC403" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_2056_11951"
          x1="572.498"
          y1="1104.39"
          x2="572.498"
          y2="96.4323"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#020203" stopOpacity="0" />
          <stop offset="1" stopColor="#020203" stopOpacity="0.88" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_2056_11951"
          x1="0"
          y1="0"
          x2="984.999"
          y2="985.999"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF0099" />
          <stop offset="1" stopColor="#FFC403" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_2056_11951"
          x1="493"
          y1="950.072"
          x2="493"
          y2="82.9574"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#020203" stopOpacity="0" />
          <stop offset="1" stopColor="#020203" stopOpacity="0.88" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default GlowBottomPart;
