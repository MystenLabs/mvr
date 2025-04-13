import { SVGProps } from "react";

const GlowTopPart = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="1440"
      height="1739"
      viewBox="0 0 1440 1739"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g opacity="0.4" filter="url(#filter0_f_2056_11950)">
        <circle
          cx="727"
          cy="727"
          r="727"
          transform="matrix(1 0 0 -1 -7 1280)"
          fill="white"
          fillOpacity="0.1"
        />
        <circle
          cx="727"
          cy="727"
          r="727"
          transform="matrix(1 0 0 -1 -7 1280)"
          fill="url(#paint0_linear_2056_11950)"
          fillOpacity="0.24"
        />
        <circle
          cx="727"
          cy="727"
          r="727"
          transform="matrix(1 0 0 -1 -7 1280)"
          fill="url(#paint1_linear_2056_11950)"
        />
      </g>
      <g
        style={{ mixBlendMode: "color-dodge" }}
        opacity="0.6"
        filter="url(#filter1_f_2056_11950)"
      >
        <circle
          cx="322.18"
          cy="322.18"
          r="322.18"
          transform="matrix(1 0 0 -1 397.82 1026.09)"
          fill="url(#paint2_linear_2056_11950)"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_2056_11950"
          x="-465.3"
          y="-632.3"
          width="2370.6"
          height="2370.6"
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
            result="effect1_foregroundBlur_2056_11950"
          />
        </filter>
        <filter
          id="filter1_f_2056_11950"
          x="-60.4797"
          y="-76.5693"
          width="1560.96"
          height="1560.96"
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
            result="effect1_foregroundBlur_2056_11950"
          />
        </filter>
        <linearGradient
          id="paint0_linear_2056_11950"
          x1="0"
          y1="0"
          x2="1454"
          y2="1454"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#B939FF" />
          <stop offset="1" stopColor="#007BFF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_2056_11950"
          x1="727"
          y1="1454"
          x2="727"
          y2="396.798"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#020203" stopOpacity="0" />
          <stop offset="1" stopColor="#020203" stopOpacity="0.88" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_2056_11950"
          x1="0"
          y1="0"
          x2="644.359"
          y2="644.359"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C251FF" />
          <stop offset="1" stopColor="#4CA2FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default GlowTopPart;
