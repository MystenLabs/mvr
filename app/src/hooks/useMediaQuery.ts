import { useCallback, useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
    const getMatchMedia = (query: string): MediaQueryList | null => {
        // Prevents SSR issues
        if (typeof window !== 'undefined') {
            return window.matchMedia(query);
        }

        return null;
    };

    const getMatches = useCallback((query: string): boolean => getMatchMedia(query)?.matches ?? false, []);

    // Start `false` on both the server and the first client render so hydration
    // matches; the real viewport value is resolved after mount in the effect below.
    // (Also switched off useLayoutEffect, which warns during SSR.)
    const [matches, setMatches] = useState<boolean>(false);

    useEffect(() => {
        const matchMedia = getMatchMedia(query);
        const listener = () => setMatches(getMatches(query));

        listener();

        if (matchMedia) {
            matchMedia.addEventListener('change', listener);
        }

        return () => {
            if (matchMedia) {
                matchMedia.removeEventListener('change', listener);
            }
        };
    }, [getMatches, query]);

    return matches;
}
