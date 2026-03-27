"use client";

import dynamic from "next/dynamic";

const Home = dynamic(() => import("@/components/Home").then((m) => m.Home), {
  ssr: false,
});

export default function Page() {
  return <Home />;
}
