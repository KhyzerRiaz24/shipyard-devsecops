# Free public showcase

The public showcase is hosted on GitHub Pages from a public repository. It uses GitHub's standard public-repository Actions runners. No AWS account, database subscription, custom domain or payment details are required for this setup.

## One source, two explicit modes

- `npm run build`: the full frontend, which calls the Express API through Nginx. Docker Compose starts the API and MongoDB.
- `npm run build:demo`: Vite's `demo` mode, published to GitHub Pages at `/shipyard-devsecops/`. `mode.js` selects `demo.js`, which stores demonstration entries in localStorage.

The demo never returns a fake “database connected” status. Its banner explains browser storage, its overview labels the storage mode, and its write form does not request a real API token. Its architecture page describes the full application's design rather than claiming a cluster is live.

Records are private to the browser/origin where they were created; clearing this site's browser storage resets the demonstration. They are not sent to a server. Treat the demo as a public educational interface and do not enter confidential data.

## Deployment flow

`.github/workflows/check-and-deploy.yml` runs application/database tests, the normal build, dependency and credential checks, Terraform validation, and Kubernetes rendering. It then builds the demo and checks it in desktop and mobile Chromium. Only a successful run on `main` can publish Pages.

The workflow uses exact action commit pins, read-only default permissions, deployment-scoped Pages permissions and a short-lived Pages artifact. It does not provision AWS infrastructure. The Jenkinsfile remains a separately documented path for a future AWS deployment.

## Verify locally

```bash
npm ci
npm run build:demo
npx playwright install chromium
npm run test:demo
```

To view the build, run `npm run preview:demo` and open `http://127.0.0.1:4173/shipyard-devsecops/`.

To test the deployed site, set `TEST_DEMO_URL` to the site's verified URL and run `npm run test:demo`. The test uses browser-local demonstration entries; it does not write into the real MongoDB application.

GitHub Pages is static hosting. It cannot run the Node API or MongoDB; those are runnable and tested in the local Docker stack. Do not describe this Pages deployment as a live AWS, Kubernetes or MongoDB deployment on a CV.

References: [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [standard public runner billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
