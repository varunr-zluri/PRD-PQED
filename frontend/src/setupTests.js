import '@testing-library/jest-dom';

// Mock import.meta.env for Vite
global.import = { meta: { env: { VITE_API_URL: 'http://localhost:3000/api' } } };

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});

// Mock scrollTo
window.scrollTo = () => { };

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

