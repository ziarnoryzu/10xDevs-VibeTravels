// Mock for astro:transitions/client virtual module
export const navigate = async (url: string): Promise<void> => {
  window.location.href = url;
};

export const supportsViewTransitions = false;
export const transitionEnabledOnThisPage = () => false;
export const getFallback = () => "none";

export const TRANSITION_BEFORE_PREPARATION = "astro:page-load";
export const TRANSITION_AFTER_PREPARATION = "astro:after-preparation";
export const TRANSITION_BEFORE_SWAP = "astro:before-swap";
export const TRANSITION_AFTER_SWAP = "astro:after-swap";
export const TRANSITION_PAGE_LOAD = "astro:page-load";
