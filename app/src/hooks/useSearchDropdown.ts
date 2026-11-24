import { type FocusEvent, type KeyboardEvent } from "react";

/** Marks the links the arrow keys move through (see `useSearchDropdown`). */
export const SEARCH_RESULT_ATTRIBUTE = "data-search-result";

/**
 * Focus & keyboard handling for a search bar and its results dropdown, to be
 * spread on the element that wraps both (the input and the results).
 *
 * - The dropdown stays open while the focus is anywhere inside the wrapper,
 *   so results can be reached with `Tab` (not only with the mouse).
 * - `ArrowDown` / `ArrowUp` move through the results (and back to the input).
 * - `Escape` closes the dropdown.
 */
export function useSearchDropdown({
  handleFocus,
  handleBlur,
}: {
  handleFocus: () => void;
  handleBlur: () => void;
}) {
  const onFocus = () => handleFocus();

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    // The focus only moved within the wrapper (e.g. from the input to a result).
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
    handleBlur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const active = document.activeElement as HTMLElement | null;

    if (e.key === "Escape") {
      active?.blur();
      return;
    }

    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

    const input = e.currentTarget.querySelector<HTMLElement>("input");
    const results = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        `[${SEARCH_RESULT_ATTRIBUTE}]`,
      ),
    );
    if (!results.length) return;

    // -1 when the focus is on the input (or on a secondary link of a result:
    // then we continue from the result it belongs to).
    const row = active?.closest("[data-search-row]");
    const index = results.findIndex(
      (result) => result === active || (!!row && row.contains(result)),
    );

    const next = e.key === "ArrowDown" ? index + 1 : index - 1;

    if (active !== input && next < 0) {
      e.preventDefault();
      input?.focus();
      return;
    }

    const target = results[next];
    if (!target) return;

    e.preventDefault();
    target.focus();
    target.scrollIntoView({ block: "nearest" });
  };

  return { onFocus, onBlur, onKeyDown };
}
