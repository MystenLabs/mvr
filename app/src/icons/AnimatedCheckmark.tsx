export const AnimatedCheckmark = () => {
  return (
    <div className="flex items-center justify-center">
      <svg
        className="h-16 w-16"
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="26"
          cy="26"
          r="25"
          className="stroke-current stroke-content-primary"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M16 26l8 8 12-16"
          className="checkmark stroke-current stroke-content-primary"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      <style jsx>{`
        .checkmark {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
          animation: draw 1s ease forwards;
        }

        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};
