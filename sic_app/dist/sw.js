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
    "url": "assets/6ELMOJL2-7IkrGG_o.js",
    "revision": null
  }, {
    "url": "assets/arrow-left-CiohVdYr.js",
    "revision": null
  }, {
    "url": "assets/arrow-right-DnDcHRZP.js",
    "revision": null
  }, {
    "url": "assets/arrow-up-down-CoBQw9V-.js",
    "revision": null
  }, {
    "url": "assets/Badge-Dd6PwJHq.js",
    "revision": null
  }, {
    "url": "assets/calendar-Bqg4nztv.js",
    "revision": null
  }, {
    "url": "assets/Card-CxURILRF.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-b4azCU5F.js",
    "revision": null
  }, {
    "url": "assets/circle-check-big-DHs17v4g.js",
    "revision": null
  }, {
    "url": "assets/circle-x-DZrLcGBX.js",
    "revision": null
  }, {
    "url": "assets/ClientCreateView-tZfAv7YP.js",
    "revision": null
  }, {
    "url": "assets/ClientDetailView-TqirpGWV.js",
    "revision": null
  }, {
    "url": "assets/ClientEditView-GGyku2FV.js",
    "revision": null
  }, {
    "url": "assets/ClientForm-BPpin0l1.js",
    "revision": null
  }, {
    "url": "assets/ClientsView-Dc6TYz_K.js",
    "revision": null
  }, {
    "url": "assets/clock-CGfnYW5h.js",
    "revision": null
  }, {
    "url": "assets/DashboardView-CmQVhkFc.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-Ds96STrW.js",
    "revision": null
  }, {
    "url": "assets/EnterpriseView-CfhCJnfJ.js",
    "revision": null
  }, {
    "url": "assets/external-link-Ur8e9abT.js",
    "revision": null
  }, {
    "url": "assets/eye-B9b0K9Ba.js",
    "revision": null
  }, {
    "url": "assets/FAQView-Dp0a0zpV.js",
    "revision": null
  }, {
    "url": "assets/globe-Cwvklkhl.js",
    "revision": null
  }, {
    "url": "assets/hooks-AQlLE-GH.js",
    "revision": null
  }, {
    "url": "assets/index-47d9ZNmd.css",
    "revision": null
  }, {
    "url": "assets/index-BZhh_Mli.js",
    "revision": null
  }, {
    "url": "assets/InvoiceCreateView-mbt7MWBg.js",
    "revision": null
  }, {
    "url": "assets/InvoiceDetailView-CM_LZPb7.js",
    "revision": null
  }, {
    "url": "assets/InvoiceEditView-aoOefvE1.js",
    "revision": null
  }, {
    "url": "assets/InvoiceForm-DeJHBRNk.js",
    "revision": null
  }, {
    "url": "assets/InvoicesView-T8WcHo6w.js",
    "revision": null
  }, {
    "url": "assets/LandingView-DVFL_241.js",
    "revision": null
  }, {
    "url": "assets/LoadingStates-C09jHE8P.js",
    "revision": null
  }, {
    "url": "assets/LoginView-DiyYmHiL.js",
    "revision": null
  }, {
    "url": "assets/mail-BYMXUgHK.js",
    "revision": null
  }, {
    "url": "assets/OnboardingView-vr5I57Cs.js",
    "revision": null
  }, {
    "url": "assets/phone-CPf7-c4D.js",
    "revision": null
  }, {
    "url": "assets/placeholder.svg",
    "revision": null
  }, {
    "url": "assets/play-rXeTVI6b.js",
    "revision": null
  }, {
    "url": "assets/plus-BsVML_eJ.js",
    "revision": null
  }, {
    "url": "assets/ReferralsView-BrNLY_5X.js",
    "revision": null
  }, {
    "url": "assets/RegisterView-DTJ5dmpn.js",
    "revision": null
  }, {
    "url": "assets/save-5KLrPNrt.js",
    "revision": null
  }, {
    "url": "assets/schemas-TvyxF2yn.js",
    "revision": null
  }, {
    "url": "assets/send-EFuE_ayM.js",
    "revision": null
  }, {
    "url": "assets/SettingsView-CnBQ2E9G.js",
    "revision": null
  }, {
    "url": "assets/square-pen-DjnfuDyY.js",
    "revision": null
  }, {
    "url": "assets/star-DmQoAuyg.js",
    "revision": null
  }, {
    "url": "assets/StatusBadge-D-4EJhy0.js",
    "revision": null
  }, {
    "url": "assets/SubscriptionView-B2kInCgF.js",
    "revision": null
  }, {
    "url": "assets/trending-up-C54qqT7o.js",
    "revision": null
  }, {
    "url": "assets/types-pFXEoYTx.js",
    "revision": null
  }, {
    "url": "assets/useMutation-CIy3e_gW.js",
    "revision": null
  }, {
    "url": "assets/user-DjIA2z9Z.js",
    "revision": null
  }, {
    "url": "icon-192x192.png",
    "revision": "8e3a10e157f75ada21ab742c022d5430"
  }, {
    "url": "index.html",
    "revision": "dc875931e0cbe9776aa79c18e06c186e"
  }, {
    "url": "offline.html",
    "revision": "5fa3861f4e63cc5cb738fb376423faee"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "vite.svg",
    "revision": "8e3a10e157f75ada21ab742c022d5430"
  }, {
    "url": "icon-192x192.png",
    "revision": "8e3a10e157f75ada21ab742c022d5430"
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
