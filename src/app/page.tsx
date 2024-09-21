"use client";

import { useEffect } from "react";
import { Neko } from "./neko";

export default function Home() {
  useEffect(() => {
    const neko = new Neko();
    neko.init();

    return () => {
      neko.destroy();
    };
  }, []);

  return <></>;
}
