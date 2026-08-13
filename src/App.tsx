import { lazy } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./libs/queryClient";
import { useTheme } from "@/libs/theme";
import { ToastContainer } from "react-toastify";
import {
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  ScrollRestoration,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import Layout from "@/pages/Layout";
import RouteError from "@/components/RouteError";
import { ProtectedRoute } from "@/ProtectedRoute";
import { RequireClub } from "@/RequireClub";
import { useAuth } from "@/hooks/useAuth";
import type { Crumb, RouteMeta } from "@/libs/routeMeta";

import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import RankingAllTimePage from "@/pages/RankingAllTimePage";
import GamesPage from "@/pages/GamesPage";
import DrillsPage from "@/pages/DrillsPage";
import ClubOnboardingPage from "@/pages/ClubOnboardingPage";

const AddGamePage = lazy(() => import("@/pages/AddGamePage"));
const RankingDailyPage = lazy(() => import("@/pages/RankingDailyPage"));
const PlayerDetailPage = lazy(() => import("@/pages/PlayerDetailPage"));
const DrillDetailPage = lazy(() => import("@/pages/DrillDetailPage"));
const DrillEditorPage = lazy(() => import("@/pages/DrillEditorPage"));
const TrainingProgressPage = lazy(() => import("@/pages/TrainingProgressPage"));
const TrainingPlanPage = lazy(() => import("@/pages/TrainingPlanPage"));
const PlayerSettingsPage = lazy(() => import("@/pages/PlayerSettingsPage"));
const ChallengesPage = lazy(() => import("@/pages/ChallengesPage"));
const ClubPage = lazy(() => import("@/pages/ClubPage"));
const PlayersPage = lazy(() => import("@/pages/PlayersPage"));
const JoinClubPage = lazy(() => import("@/pages/JoinClubPage"));
const TournamentsPage = lazy(() => import("@/pages/TournamentsPage"));
const TournamentPage = lazy(() => import("@/pages/TournamentPage"));

/** "/me/..." resolves to the signed-in player's own URL. Lets links exist before
 *  we know their id. */
function MeRedirect({ suffix = "" }: { suffix?: string }) {
  const { player } = useAuth();
  return (
    <Navigate
      to={player ? `/app/players/${player.id}${suffix}` : "/app"}
      replace
    />
  );
}

/**
 * Everything under a player is two levels deep. The middle crumb is named by
 * the player, so those pages hand PageTitle the real name — this is the trail
 * the app bar's back chevron uses and the fallback label if data is still on
 * its way.
 */
const PLAYER_CRUMBS: Crumb[] = [
  { labelKey: "players.title", to: "/app/players" },
  { labelKey: "players.detailTitle", to: "/app/players/:playerId" },
];

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Root />} errorElement={<RouteError />}>
      {/* The public front door. Everything a signed-in member uses lives
        under /app, which is also the PWA's start URL — so installing
        the app skips the pitch. */}
      <Route path="/" element={<LandingPage />} />

      <Route path="/app" element={<Layout />}>
        {/* The only two doors that open from outside a club. */}
        <Route path="login" element={<LoginPage />} />
        <Route path="join/:code" element={<JoinClubPage />} />

        {/* Clubs are members-only, so every page below needs both an
                  account and an approved membership. */}
        <Route element={<ProtectedRoute />}>
          {/* Outside RequireClub: starting or joining a second club is
                    the one club-scoped thing members already in one can do. */}
          <Route path="clubs/new" element={<ClubOnboardingPage />} />

          {/* `handle` is where a page says which section it belongs to and what
              it hangs off. The app bar reads the last crumb for its back
              chevron, the page's own title block reads the trail — so a route's
              place in the app is declared once, here, next to the route. */}
          <Route element={<RequireClub />}>
            <Route
              index
              element={<DashboardPage />}
              handle={{ section: "home" } satisfies RouteMeta}
            />

            <Route
              path="ranking"
              element={<RankingAllTimePage />}
              handle={{ section: "ranking" } satisfies RouteMeta}
            />
            <Route
              path="ranking/daily"
              element={<RankingDailyPage />}
              handle={
                {
                  section: "ranking",
                  crumbs: [{ labelKey: "nav.ranking", to: "/app/ranking" }],
                } satisfies RouteMeta
              }
            />

            <Route
              path="games"
              element={<GamesPage />}
              handle={{ section: "games" } satisfies RouteMeta}
            />
            <Route
              path="games/new"
              element={<AddGamePage />}
              handle={
                {
                  section: "games",
                  crumbs: [{ labelKey: "nav.games", to: "/app/games" }],
                } satisfies RouteMeta
              }
            />
            <Route
              path="challenges"
              element={<ChallengesPage />}
              handle={{ section: "games" } satisfies RouteMeta}
            />
            <Route
              path="tournaments"
              element={<TournamentsPage />}
              handle={{ section: "tournaments" } satisfies RouteMeta}
            />
            <Route
              path="tournaments/:id"
              element={<TournamentPage />}
              handle={
                {
                  section: "tournaments",
                  crumbs: [
                    { labelKey: "nav.tournaments", to: "/app/tournaments" },
                  ],
                } satisfies RouteMeta
              }
            />

            {/* Reading the roster and administering it are different jobs:
                this is the read-only card list, club settings keeps add/approve
                /remove. */}
            <Route path="players" element={<PlayersPage />} />
            <Route
              path="players/:id"
              element={<PlayerDetailPage />}
              handle={
                {
                  crumbs: [{ labelKey: "players.title", to: "/app/players" }],
                } satisfies RouteMeta
              }
            />
            <Route path="club" element={<ClubPage />} />
            <Route
              path="drills"
              element={<DrillsPage />}
              handle={{ section: "drills" } satisfies RouteMeta}
            />
            <Route
              path="drills/:id"
              element={<DrillDetailPage />}
              handle={
                {
                  section: "drills",
                  crumbs: [{ labelKey: "drills.title", to: "/app/drills" }],
                } satisfies RouteMeta
              }
            />

            <Route path="me" element={<MeRedirect />} />
            <Route
              path="me/training"
              element={<MeRedirect suffix="/training" />}
            />
            <Route
              path="me/training/plan"
              element={<MeRedirect suffix="/training/plan" />}
            />
            <Route
              path="players/:playerId/training"
              element={<TrainingProgressPage />}
              handle={
                {
                  section: "drills",
                  crumbs: PLAYER_CRUMBS,
                } satisfies RouteMeta
              }
            />
            <Route
              path="players/:playerId/training/plan"
              element={<TrainingPlanPage />}
              handle={
                {
                  section: "drills",
                  crumbs: PLAYER_CRUMBS,
                } satisfies RouteMeta
              }
            />
            <Route
              path="me/settings"
              element={<MeRedirect suffix="/settings" />}
            />
            <Route
              path="players/:playerId/settings"
              element={<PlayerSettingsPage />}
              handle={{ crumbs: PLAYER_CRUMBS } satisfies RouteMeta}
            />
            {/* Drills are one global library shared by every club;
                      DrillEditorPage turns away non-owners on /edit. */}
            <Route
              path="drills/new"
              element={<DrillEditorPage />}
              handle={
                {
                  section: "drills",
                  crumbs: [{ labelKey: "drills.title", to: "/app/drills" }],
                } satisfies RouteMeta
              }
            />
            <Route
              path="drills/:id/edit"
              element={<DrillEditorPage />}
              handle={
                {
                  section: "drills",
                  crumbs: [
                    { labelKey: "drills.title", to: "/app/drills" },
                    { labelKey: "drills.detailTitle", to: "/app/drills/:id" },
                  ],
                } satisfies RouteMeta
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      {/* Anything outside /app that isn't the landing goes to the pitch. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
);

export default function App() {
  const theme = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <ToastContainer
            // Toasts are the one surface not built from our tokens, so they get
            // told which way round the page is.
            theme={theme}
            position="bottom-center"
            autoClose={2600}
            hideProgressBar
          />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
