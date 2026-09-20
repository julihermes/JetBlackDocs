import { lazy, Suspense } from "preact/compat";
import { Route, Router, Switch } from "wouter-preact";
import { Nav } from "./components/Nav";
import { PageLoading } from "./components/PageLoading";

const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const Pokedex = lazy(() => import("./pages/Pokedex").then((m) => ({ default: m.Pokedex })));
const PokemonDetail = lazy(() => import("./pages/PokemonDetail").then((m) => ({ default: m.PokemonDetail })));
const Encounters = lazy(() => import("./pages/Encounters").then((m) => ({ default: m.Encounters })));
const Trainers = lazy(() => import("./pages/Trainers").then((m) => ({ default: m.Trainers })));
const Items = lazy(() => import("./pages/Items").then((m) => ({ default: m.Items })));
const MoveList = lazy(() => import("./pages/MoveList").then((m) => ({ default: m.MoveList })));
const MoveDetail = lazy(() => import("./pages/MoveDetail").then((m) => ({ default: m.MoveDetail })));
const Evolutions = lazy(() => import("./pages/Evolutions").then((m) => ({ default: m.Evolutions })));
const Legendaries = lazy(() => import("./pages/Legendaries").then((m) => ({ default: m.Legendaries })));
const Nuzlocke = lazy(() => import("./pages/Nuzlocke").then((m) => ({ default: m.Nuzlocke })));
const History = lazy(() => import("./pages/History").then((m) => ({ default: m.History })));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export function App() {
  return (
    <Router base={base}>
      <div className="app-shell">
        <Nav />
        <Suspense fallback={<PageLoading />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/pokedex" component={Pokedex} />
            <Route path="/pokedex/:name" component={PokemonDetail} />
            <Route path="/encounters" component={Encounters} />
            <Route path="/trainers" component={Trainers} />
            <Route path="/items" component={Items} />
            <Route path="/moves" component={MoveList} />
            <Route path="/moves/:name" component={MoveDetail} />
            <Route path="/evolutions" component={Evolutions} />
            <Route path="/legendaries" component={Legendaries} />
            <Route path="/nuzlocke" component={Nuzlocke} />
            <Route path="/history" component={History} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
    </Router>
  );
}
