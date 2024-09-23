"use client";

import { useEffect } from "react";
import { Neko } from "./neko";
import useLagRadar from "./useLagRadar";

const nekoImageUrls = [
  "ace.png",
  "earth.png",
  "marmalade.png",
  "peach.png",
  "tabby.png",
  "air.png",
  "fancy.png",
  "mermaid.png",
  "pink.png",
  "usa.png",
  "black.png",
  "fire.png",
  "mike.png",
  "rainbow.png",
  "valentine.png",
  "blue.png",
  "ghetto.png",
  "moka.png",
  "robot.png",
  "water.png",
  "calico.png",
  "ghost.png",
  "royal.png",
  "colourful.png",
  "jess.png",
  "neon.png",
  "silversky.png",
  "dave.png",
  "lucky.png",
  "socks.png",
  "dog.png",
  "lucy.png",
  "orange.png",
  "spirit.png",
];

export default function Home() {
  useLagRadar();

  useEffect(() => {
    const neko = new Neko({ nekoName: "neko", nekoImageUrl: "/neko.png" });
    neko.init();

    const nekoInstances: Neko[] = [];

    nekoImageUrls.forEach((url, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;

      const n = new Neko({
        nekoName: url.split(".")[0],
        nekoImageUrl: `/${url}`,
        initialPosX: col * 100 + 50,
        initialPosY: row * 100 + 50,
      });

      n.init();
      nekoInstances.push(n);
    });

    return () => {
      neko.destroy();
      nekoInstances.forEach((neko) => neko.destroy());
    };
  }, []);

  return <></>;
}
