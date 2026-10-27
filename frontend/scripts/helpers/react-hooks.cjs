const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function load(file, dependencies, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return module.exports;
}

// Controle determinístico do ciclo dos hooks, sem runner ou dependência adicional.
function hooks() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(current) { const i = cursor++; return slots[i] ??= { current }; },
    useMemo(callback, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(callback, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: callback() };
      });
    },
  };
  return {
    react,
    render(callback, commit = true) {
      cursor = 0;
      const value = callback();
      if (commit) { const pending = effects; effects = []; pending.forEach((effect) => effect()); }
      return value;
    },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}


module.exports = { load, hooks, settle, deferred };
