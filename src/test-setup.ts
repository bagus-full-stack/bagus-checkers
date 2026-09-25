// jsdom (the test environment) doesn't implement matchMedia. Anything that
// injects ThemeService - even indirectly, like AppComponent - throws without
// this, so it's mocked once here rather than per-spec-file.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
