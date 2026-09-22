import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import compress from "astro-compress";
import sitemap from "@astrojs/sitemap";
import { festivalGlyphs, latinGlyphs } from "./src/config/font-glyphs";

export default defineConfig({
	site: "https://www.soei-fes.com",
	output: "static",
	image: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "yokohamasoei.sakura.ne.jp",
				pathname: "/wp/wp-content/uploads/**",
			},
			{
				protocol: "https",
				hostname: "www.soei.ed.jp",
				pathname: "/oclp_j/assets/img/**",
			},
			{
				protocol: "https",
				hostname: "www.townnews.co.jp",
				pathname: "/0117/images/**",
			},
		],
	},
	vite: {
		plugins: [tailwindcss()],
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Shippori Mincho",
			cssVariable: "--font-shippori-mincho",
			weights: [400, 700, 800],
			styles: ["normal"],
			display: "swap",
			subsets: ["japanese", "latin"],
			fallbacks: ["serif"],
			options: {
				experimental: { glyphs: festivalGlyphs },
			},
		},
		{
			provider: fontProviders.google(),
			name: "Montserrat",
			cssVariable: "--font-montserrat",
			weights: [400, 700],
			styles: ["normal"],
			display: "swap",
			subsets: ["latin"],
			fallbacks: ["sans-serif"],
			options: {
				experimental: { glyphs: latinGlyphs },
			},
		},
	],
	// Astro's generated module wrappers are already minified by Vite and can
	// contain syntax that terser cannot parse. Keep astro-compress focused on
	// the generated HTML/CSS/SVG/image assets.
	integrations: [compress({ JavaScript: false }), sitemap()],
});
