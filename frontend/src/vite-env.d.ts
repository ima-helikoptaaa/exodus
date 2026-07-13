/// <reference types="vite/client" />

declare module 'latex.js' {
  export class HtmlGenerator {
    constructor(options?: object);
  }
  export function parse(latex: string, options?: object): { htmlDocument(): Document };
}
