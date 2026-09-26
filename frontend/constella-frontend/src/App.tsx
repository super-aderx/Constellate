import { AppPage } from "@/features/app/AppPage"
import { LandingPage } from "@/features/landing/LandingPage"
import { useHashRoute } from "@/hooks/useHashRoute"

/** "#/home", "#/network" … open the signed-in app; anything else is the landing page. */
export default function App() {
  const route = useHashRoute()
  return route == null ? <LandingPage /> : <AppPage route={route} />
}
