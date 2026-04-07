import dynamic from "next/dynamic";

// Load entirely client-side — uses localStorage, Web Audio, navigator.vibrate
const FitnessApp = dynamic(() => import("./FitnessApp"), { ssr: false });

export default function Page() {
  return <FitnessApp />;
}
