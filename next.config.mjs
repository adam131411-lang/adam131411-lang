/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 確保 AI 分析用到的 skill 檔案會被打包進 serverless function(Vercel)
  outputFileTracingIncludes: {
    "/api/analyze/[id]": [".claude/skills/**/*.md"],
  },
};

export default nextConfig;
