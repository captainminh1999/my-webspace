# Dependencies Reference

This file lists all npm packages used in the Interactive CV project.

## Installation Commands

```bash
# Install all dependencies
npm install

# Install production only
npm install --production

# Install specific package
npm install <package-name>

# Install dev dependency
npm install --save-dev <package-name>
```

## Core Framework & Runtime

```bash
npm install next@^15.3.3
npm install react@^19.1.0
npm install react-dom@^19.1.0
```

## UI Framework & Styling

```bash
npm install tailwindcss@^4.1.8
npm install @tailwindcss/typography@^0.5.16
npm install @tailwindcss/forms@^0.5.10
npm install @tailwindcss/aspect-ratio@^0.4.2
npm install @tailwindcss/line-clamp@^0.4.4
npm install @tailwindcss/postcss@^4
npm install postcss@^8.5.4
npm install autoprefixer@^10.4.21
```

## Icons & Animations

```bash
npm install lucide-react@^0.511.0
npm install framer-motion@^12.18.1
```

## Database & Backend

```bash
npm install mongodb@^6.17.0
```

## Data Processing & Utilities

```bash
npm install papaparse@^5.5.3
npm install date-fns@^4.1.0
npm install node-fetch@^2.7.0
npm install @octokit/rest@^22.0.0
```

## Development Dependencies

```bash
npm install --save-dev @netlify/functions@^4.0.0
npm install --save-dev typescript@^5.8.3
npm install --save-dev @types/node@^20
npm install --save-dev @types/react@^19
npm install --save-dev @types/react-dom@^19
npm install --save-dev @types/papaparse@^5.3.16
npm install --save-dev @types/estree@^1.0.7
npm install --save-dev @types/json-schema@^7.0.15
npm install --save-dev eslint@^9
npm install --save-dev eslint-config-next@15.3.3
npm install --save-dev @eslint/eslintrc@^3
npm install --save-dev ts-node@^10.9.2
```

## All at Once Installation

### Production Dependencies
```bash
npm install next@^15.3.3 react@^19.1.0 react-dom@^19.1.0 tailwindcss@^4.1.8 @tailwindcss/typography@^0.5.16 @tailwindcss/forms@^0.5.10 @tailwindcss/aspect-ratio@^0.4.2 @tailwindcss/line-clamp@^0.4.4 @tailwindcss/postcss@^4 postcss@^8.5.4 autoprefixer@^10.4.21 lucide-react@^0.511.0 framer-motion@^12.18.1 mongodb@^6.17.0 papaparse@^5.5.3 date-fns@^4.1.0 node-fetch@^2.7.0 @octokit/rest@^22.0.0
```

### Development Dependencies
```bash
npm install --save-dev @netlify/functions@^4.0.0 typescript@^5.8.3 @types/node@^20 @types/react@^19 @types/react-dom@^19 @types/papaparse@^5.3.16 @types/estree@^1.0.7 @types/json-schema@^7.0.15 eslint@^9 eslint-config-next@15.3.3 @eslint/eslintrc@^3 ts-node@^10.9.2
```

## Package.json Verification

Your `package.json` should contain these dependencies. If any are missing, add them manually or use the install commands above.

## Troubleshooting

If you encounter installation issues:

1. **Clear npm cache**: `npm cache clean --force`
2. **Delete node_modules**: `rm -rf node_modules package-lock.json`
3. **Reinstall**: `npm install`
4. **Check Node version**: `node --version` (should be 18+)
5. **Update npm**: `npm install -g npm@latest`
