const ReactGlobal = globalThis.React;
if (!ReactGlobal) throw new Error('React must be loaded before react-jsx-runtime-browser.js');

export const Fragment = ReactGlobal.Fragment;
export const jsx = (type, props, key) => {
  if (key === undefined) return ReactGlobal.createElement(type, props);
  return ReactGlobal.createElement(type, { ...props, key });
};
export const jsxs = jsx;
