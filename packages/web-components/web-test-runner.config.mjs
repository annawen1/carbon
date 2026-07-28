import { puppeteerLauncher } from '@web/test-runner-puppeteer';

const chromeLaunchArgs = process.env.CI
  ? ['--no-sandbox', '--disable-setuid-sandbox']
  : [];

export default {
  browsers: [
    puppeteerLauncher({
      launchOptions: {
        args: chromeLaunchArgs,
      },
    }),
  ],
  files: 'src/{components,globals}/**/__tests__/**/*.js',
  nodeResolve: {
    extensions: ['.js', '.ts'],
  },
  concurrency: 1,

  rootDir: '.',

  coverage: true,
  coverageConfig: {
    report: true,
    reportDir: 'coverage',
    reporters: ['lcov', 'text-summary', 'html'],

    include: [
      'es/components/**/*.js',
      '!es/components/**/index.js',
      '!es/components/**/__tests__/**/*',
    ],

    exclude: [
      'node_modules/**/*',
      'coverage/**/*',
      '**/*.stories.js',
      '**/*.scss',
      'tests/**/*',
      '.storybook/**/*',
    ],

    sourceMap: true,
    all: true,

    // thresholds can be modified once all components have unit tests
    threshold: {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60,
    },
  },

  middleware: [
    (context, next) => {
      const url = context.url;

      // Serve source maps with correct headers
      if (url.endsWith('.js.map')) {
        context.type = 'application/json';
        context.set('Access-Control-Allow-Origin', '*');
      }

      // Add source map headers for component JS files
      if (
        url.endsWith('.js') &&
        url.includes('/components/') &&
        !url.includes('__tests__')
      ) {
        context.set('SourceMap', url + '.map');
      }

      return next();
    },
  ],

  testFramework: {
    config: {
      timeout: 5000,
    },
  },

  // Motion (and some Carbon packages) read process.env.NODE_ENV; browsers
  // do not define `process` unless a bundler replaces it.
  testRunnerHtml: (testFramework) => `<!DOCTYPE html>
<html>
  <head></head>
  <body>
    <script>
      window.process = window.process || { env: { NODE_ENV: 'test' } };
    </script>
    <script type="module" src="${testFramework}"></script>
  </body>
</html>
`,
};
