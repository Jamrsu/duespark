/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-f1e82ed9'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "assets/Badge-dcvuvZBI.js",
    "revision": null
  }, {
    "url": "assets/ClientCreateView-D45VEjtM.js",
    "revision": null
  }, {
    "url": "assets/ClientDetailView-CyABFG_W.js",
    "revision": null
  }, {
    "url": "assets/ClientEditView-CotD8A4_.js",
    "revision": null
  }, {
    "url": "assets/ClientForm-CIteNxtr.js",
    "revision": null
  }, {
    "url": "assets/ClientsView-lh5GLU_C.js",
    "revision": null
  }, {
    "url": "assets/DashboardView-QHy7MdA4.js",
    "revision": null
  }, {
    "url": "assets/data-vendor-vybsYvzX.js",
    "revision": null
  }, {
    "url": "assets/date-vendor-DBdW3y0n.js",
    "revision": null
  }, {
    "url": "assets/EnterpriseView-DqcW4jxb.js",
    "revision": null
  }, {
    "url": "assets/FAQView-CilidcQ-.js",
    "revision": null
  }, {
    "url": "assets/form-vendor-IAZZ7zNx.js",
    "revision": null
  }, {
    "url": "assets/hooks-De3QLl0G.js",
    "revision": null
  }, {
    "url": "assets/index-6g1Lgde9.css",
    "revision": null
  }, {
    "url": "assets/index-CyK9IDyA.js",
    "revision": null
  }, {
    "url": "assets/InvoiceCreateView-BqiorCqY.js",
    "revision": null
  }, {
    "url": "assets/InvoiceDetailView-B4TXTp6b.js",
    "revision": null
  }, {
    "url": "assets/InvoiceEditView-hbCzvGl9.js",
    "revision": null
  }, {
    "url": "assets/InvoiceForm-C0UPslng.js",
    "revision": null
  }, {
    "url": "assets/InvoicesView-Ccs-bCZF.js",
    "revision": null
  }, {
    "url": "assets/LoadingStates-gn6_MbE0.js",
    "revision": null
  }, {
    "url": "assets/LoginView-QM8qm4KZ.js",
    "revision": null
  }, {
    "url": "assets/OnboardingView-Bhed6iyZ.js",
    "revision": null
  }, {
    "url": "assets/placeholder.svg",
    "revision": null
  }, {
    "url": "assets/react-vendor-DBbBoGAA.js",
    "revision": null
  }, {
    "url": "assets/ReferralsView-DbxCdNNa.js",
    "revision": null
  }, {
    "url": "assets/RegisterView-yU8Tu6Ly.js",
    "revision": null
  }, {
    "url": "assets/schemas-DELryz0P.js",
    "revision": null
  }, {
    "url": "assets/SettingsView-QqRoarq-.js",
    "revision": null
  }, {
    "url": "assets/StatusBadge-kyg_Rki7.js",
    "revision": null
  }, {
    "url": "assets/SubscriptionView-BN6jbs_L.js",
    "revision": null
  }, {
    "url": "assets/vendor-DjxHXWWU.js",
    "revision": null
  }, {
    "url": "index.html",
    "revision": "bade2a86e12669d239bc4d9cf0a1b922"
  }, {
    "url": "offline.html",
    "revision": "5fa3861f4e63cc5cb738fb376423faee"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "manifest.webmanifest",
    "revision": "96b77deac99266e246300e79079264f8"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/api\./, new workbox.NetworkFirst({
    "cacheName": "api-cache",
    "networkTimeoutSeconds": 10,
    plugins: [new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/\.(png|jpg|jpeg|svg|gif)$/, new workbox.CacheFirst({
    "cacheName": "images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');

}));
