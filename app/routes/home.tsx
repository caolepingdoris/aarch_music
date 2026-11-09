import type { Route } from "./+types/home";
import { Elevation } from "../elevation/Elevation";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "The Resonant Frame" },
    {
      name: "description",
      content: "Turn a structure's era, region, materials and rhythm into a short generative score.",
    },
  ];
}

export const links: Route.LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Fraunces:wght@300;500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
];

export default function Home() {
  return <Elevation />;
}
