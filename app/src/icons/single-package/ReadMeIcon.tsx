import { SVGProps } from "react";

export function ReadMeIconUnselected(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      {...props}
    >
      <path
        d="M12.3091 0.699486C8.7697 1.16116 7 3.81571 7 3.81571V13.3686C7 13.3686 8.7697 10.714 12.3091 10.2523C12.8904 10.1765 13.3686 9.70907 13.3686 9.12286V1.69286C13.3686 1.10665 12.8904 0.623656 12.3091 0.699486Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.69092 0.699486C5.2303 1.16116 7 3.81571 7 3.81571V13.3686C7 13.3686 5.2303 10.714 1.69092 10.2523C1.10963 10.1765 0.631432 9.70907 0.631432 9.12286V1.69286C0.631432 1.10665 1.10963 0.623656 1.69092 0.699486Z"
        stroke="white"
        strokeWidth="1.14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReadMeIconSelected(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="15"
      viewBox="0 0 16 15"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.14284 14.6994V2.8144C7.07515 2.75587 7.00485 2.69678 6.93195 2.63735C5.91957 1.81203 4.39403 0.915205 2.35751 0.649557C1.33964 0.516782 0.571411 1.36203 0.571411 2.28577V10.2858C0.571411 11.2493 1.3466 11.9559 2.2097 12.0686C3.98411 12.3 5.31675 13.0808 6.20982 13.8089C6.61284 14.1374 6.92403 14.4535 7.14284 14.6994ZM8.85713 2.8144V14.6994C9.07594 14.4535 9.38713 14.1374 9.79014 13.8089C10.6832 13.0808 12.0159 12.3 13.7903 12.0686C14.6534 11.9559 15.4286 11.2493 15.4286 10.2858V2.28577C15.4286 1.36203 14.6603 0.516782 13.6425 0.649557C11.6059 0.915205 10.0804 1.81203 9.06802 2.63735C8.99511 2.69678 8.92482 2.75587 8.85713 2.8144Z"
        className="fill-bg-accent"
      />
    </svg>
  );
}
