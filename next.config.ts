import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 複数のpackage-lock.jsonが存在する場合にNext.jsがルートを誤検知するのを防ぐ
  turbopack: { root: __dirname } // rebuild trigger,
};

export default nextConfig;
