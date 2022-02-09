import React from "react";
import * as Server from "react-dom/server";
import ReactDOM from "react-dom";
import { Renderer } from "./Renderer";
import "./components/csscomponents/index.js";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { RangeRequestsPlugin } from "workbox-range-requests";

export const App = (metaData) => {
  console.log(Server.renderToString(<Renderer {...metaData} />));
  ReactDOM.render(<Renderer {...metaData} />, document.getElementById("root"));

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js");
    });
  }

  // In your service worker:
  // It's up to you to either precache or explicitly call cache.add('movie.mp4')
  // to populate the cache.
  //
  // This route will go against the network if there isn't a cache match,
  // but it won't populate the cache at runtime.
  // If there is a cache match, then it will properly serve partial responses.
  registerRoute(
    ({ url }) => url.pathname.endsWith(".mp4"),
    new CacheFirst({
      cacheName: "video-pre-cache",
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new RangeRequestsPlugin(),
      ],
    })
  );
};
