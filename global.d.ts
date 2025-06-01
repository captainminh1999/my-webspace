/* Quick shim so `import foo from '@/data/file.json'` has type `any` */
declare module '*.json' {
  const value: any;
  export default value;
}
