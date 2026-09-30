/** Statisk eksport: hostes på hvilken som helst statisk vert. Data ligger i /public/data.
 *  BASE_PATH (f.eks. /norwaysdoom for GitHub Pages) settes ved bygg. */
const basePath = process.env.BASE_PATH || "";
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default nextConfig;
